#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_spice, arduino_compile_simulate, search_components, import_catalog_jsonl])
        .run(tauri::generate_context!())
        .expect("error while running B-Z Circuit Lab");
}

#[tauri::command]
fn run_spice(netlist: String) -> Result<String, String> {
    use std::{fs, process::Command, time::{SystemTime, UNIX_EPOCH}};
    if netlist.len() > 2_000_000 { return Err("Netlist is too large (2 MB limit).".into()); }
    if !netlist.to_ascii_lowercase().contains(".end") { return Err("Invalid SPICE netlist: missing .end.".into()); }
    let id = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    let path = std::env::temp_dir().join(format!("bz-circuit-{id}.cir"));
    fs::write(&path, netlist).map_err(|e| format!("Cannot write netlist: {e}"))?;
    let output = Command::new("ngspice").arg("-b").arg(&path).output();
    let _ = fs::remove_file(&path);
    match output {
        Ok(out) => {
            let mut text = String::from_utf8_lossy(&out.stdout).to_string();
            text.push_str(&String::from_utf8_lossy(&out.stderr));
            if out.status.success() { Ok(text) } else { Err(format!("ngspice failed: {text}")) }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Err("ngspice نصب نیست یا در PATH ویندوز قرار ندارد. فایل .cir را می‌توانی جداگانه در ngspice اجرا کنی.".into()),
        Err(e) => Err(format!("Cannot start ngspice: {e}"))
    }
}

#[tauri::command]
fn arduino_compile_simulate(sketch: String, fqbn: String) -> Result<String, String> {
    use std::{fs, process::{Command, Stdio}, time::{SystemTime, UNIX_EPOCH, Instant, Duration}, thread::sleep};
    let supported = ["arduino:avr:uno", "arduino:avr:nano"];
    if !supported.contains(&fqbn.as_str()) { return Err("Only Arduino Uno R3 and Nano (ATmega328P) are enabled in this build.".into()); }
    if sketch.len() > 512_000 { return Err("Sketch exceeds the 512 KB limit.".into()); }
    let id = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    let root = std::env::temp_dir().join(format!("bz-arduino-{id}"));
    let sketch_dir = root.join("Sketch");
    let build_dir = root.join("build");
    fs::create_dir_all(&sketch_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&build_dir).map_err(|e| e.to_string())?;
    fs::write(sketch_dir.join("Sketch.ino"), sketch).map_err(|e| e.to_string())?;
    let compile = Command::new("arduino-cli").args(["compile", "--fqbn", &fqbn, "--output-dir"]).arg(&build_dir).arg(&sketch_dir).output();
    let compile = match compile {
        Ok(v) => v,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => { let _ = fs::remove_dir_all(&root); return Err("arduino-cli نصب نیست یا در PATH ویندوز قرار ندارد.".into()); },
        Err(e) => { let _ = fs::remove_dir_all(&root); return Err(format!("Cannot start Arduino CLI: {e}")); }
    };
    let compile_log = format!("{}{}", String::from_utf8_lossy(&compile.stdout), String::from_utf8_lossy(&compile.stderr));
    if !compile.status.success() { let _ = fs::remove_dir_all(&root); return Err(format!("Arduino compilation failed:\n{compile_log}")); }
    let hex = fs::read_dir(&build_dir).map_err(|e| e.to_string())?.filter_map(Result::ok).map(|e| e.path()).find(|p| p.extension().and_then(|s| s.to_str()).map(|s| s.eq_ignore_ascii_case("hex")).unwrap_or(false));
    let Some(hex_path) = hex else { let _ = fs::remove_dir_all(&root); return Err(format!("Compilation succeeded but no HEX file was produced.\n{compile_log}")); };
    let sim = Command::new("simavr").args(["-m", "atmega328p", "-f", "16000000"]).arg(&hex_path).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn();
    let result = match sim {
        Ok(mut child) => {
            let deadline = Instant::now() + Duration::from_secs(5);
            let mut finished = false;
            while Instant::now() < deadline {
                match child.try_wait() {
                    Ok(Some(_)) => { finished = true; break; },
                    Ok(None) => sleep(Duration::from_millis(100)),
                    Err(_) => break,
                }
            }
            if !finished { let _ = child.kill(); }
            match child.wait_with_output() {
                Ok(out) => format!("COMPILE SUCCESS\n{compile_log}\nSIMAVR OUTPUT (5 second capture)\n{}{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr)),
                Err(e) => format!("COMPILE SUCCESS\n{compile_log}\nCould not collect simavr output: {e}")
            }
        },
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => format!("COMPILE SUCCESS\n{compile_log}\nSIMULATION NOT RUN: simavr is not installed or not in PATH."),
        Err(e) => format!("COMPILE SUCCESS\n{compile_log}\nCould not start simavr: {e}")
    };
    let _ = fs::remove_dir_all(&root);
    Ok(result)
}

#[derive(serde::Serialize)]
struct CatalogComponent {
    manufacturer: String,
    mpn: String,
    description: String,
    support_level: String,
    package: Option<String>,
    spice_model: Option<String>,
    datasheet_url: Option<String>,
    source_name: String,
    source_url: String,
    license_id: String,
}

#[derive(serde::Deserialize)]
struct CatalogImportRecord {
    manufacturer: String,
    mpn: String,
    description: String,
    support_level: String,
    #[serde(default)] package: Option<String>,
    #[serde(default)] symbol: Option<String>,
    #[serde(default)] footprint: Option<String>,
    #[serde(default)] spice_model: Option<String>,
    #[serde(default)] datasheet_url: Option<String>,
    source_name: String,
    source_url: String,
    license_id: String,
    #[serde(default)] metadata: Option<serde_json::Value>,
}

fn catalog_db(app: &tauri::AppHandle) -> Result<rusqlite::Connection, String> {
    use tauri::Manager;
    let dir = app.path().app_data_dir().map_err(|e| format!("Cannot locate app data: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create app data directory: {e}"))?;
    let db = rusqlite::Connection::open(dir.join("components.sqlite")).map_err(|e| format!("Cannot open catalog: {e}"))?;
    db.execute_batch("PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS components (
        id INTEGER PRIMARY KEY,
        manufacturer TEXT NOT NULL,
        mpn TEXT NOT NULL,
        description TEXT NOT NULL,
        support_level TEXT NOT NULL CHECK(support_level IN ('A','B','C')),
        package TEXT, symbol TEXT, footprint TEXT, spice_model TEXT, datasheet_url TEXT,
        source_name TEXT NOT NULL, source_url TEXT NOT NULL, license_id TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        UNIQUE(manufacturer,mpn)
      );
      CREATE INDEX IF NOT EXISTS idx_catalog_mpn ON components(mpn);
      CREATE INDEX IF NOT EXISTS idx_catalog_manufacturer ON components(manufacturer);
      CREATE INDEX IF NOT EXISTS idx_catalog_description ON components(description);")
      .map_err(|e| format!("Cannot initialize catalog: {e}"))?;
    Ok(db)
}

#[tauri::command]
fn search_components(app: tauri::AppHandle, query: String, limit: Option<u32>) -> Result<Vec<CatalogComponent>, String> {
    let db = catalog_db(&app)?;
    let q = format!("%{}%", query.trim());
    let limit = limit.unwrap_or(50).clamp(1, 500);
    let mut statement = db.prepare("SELECT manufacturer,mpn,description,support_level,package,spice_model,datasheet_url,source_name,source_url,license_id FROM components WHERE ?1='' OR manufacturer LIKE ?2 OR mpn LIKE ?2 OR description LIKE ?2 ORDER BY manufacturer,mpn LIMIT ?3")
      .map_err(|e| e.to_string())?;
    let rows = statement.query_map(rusqlite::params![query.trim(), q, limit], |row| Ok(CatalogComponent {
        manufacturer: row.get(0)?, mpn: row.get(1)?, description: row.get(2)?, support_level: row.get(3)?,
        package: row.get(4)?, spice_model: row.get(5)?, datasheet_url: row.get(6)?,
        source_name: row.get(7)?, source_url: row.get(8)?, license_id: row.get(9)?,
    })).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn import_catalog_jsonl(app: tauri::AppHandle, content: String) -> Result<String, String> {
    if content.len() > 20_000_000 { return Err("Catalog import is limited to 20 MB per file.".into()); }
    let mut db = catalog_db(&app)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    let mut inserted = 0usize;
    let mut duplicates = 0usize;
    for (index, line) in content.lines().enumerate() {
        if line.trim().is_empty() { continue; }
        let item: CatalogImportRecord = serde_json::from_str(line).map_err(|e| format!("Invalid JSON on line {}: {e}", index + 1))?;
        if item.manufacturer.trim().is_empty() || item.mpn.trim().is_empty() || item.description.trim().is_empty()
            || item.source_name.trim().is_empty() || item.source_url.trim().is_empty() || item.license_id.trim().is_empty() {
            return Err(format!("Required catalog fields are missing on line {}.", index + 1));
        }
        if !["A", "B", "C"].contains(&item.support_level.as_str()) {
            return Err(format!("Invalid support_level on line {}; use A, B or C.", index + 1));
        }
        let changed = tx.execute("INSERT OR IGNORE INTO components (manufacturer,mpn,description,support_level,package,symbol,footprint,spice_model,datasheet_url,source_name,source_url,license_id,metadata_json) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
            rusqlite::params![item.manufacturer,item.mpn,item.description,item.support_level,item.package,item.symbol,item.footprint,item.spice_model,item.datasheet_url,item.source_name,item.source_url,item.license_id,item.metadata.unwrap_or(serde_json::Value::Null).to_string()])
            .map_err(|e| format!("Database error on line {}: {e}", index + 1))?;
        if changed == 1 { inserted += 1; } else { duplicates += 1; }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(format!("Imported {inserted} components; skipped {duplicates} duplicates."))
}
