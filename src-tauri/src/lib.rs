#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_spice, arduino_compile_simulate])
        .run(tauri::generate_context!())
        .expect("error while running B-Z Circuit Lab");
}

#[tauri::command]
fn run_spice(netlist: String) -> Result<String, String> {
    use std::{fs, process::{Command, Stdio}, time::{SystemTime, UNIX_EPOCH, Instant}, thread::sleep, time::Duration};
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
    use std::{fs, process::Command, time::{SystemTime, UNIX_EPOCH}};
    let supported = ["arduino:avr:uno", "arduino:avr:nano"];
    if !supported.contains(&fqbn.as_str()) { return Err("Only Arduino Uno R3 and Nano (ATmega328P) are enabled in this build.".into()); }
    if sketch.len() > 512_000 { return Err("Sketch exceeds the 512 KB limit.".into()); }
    let id = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    let root = std::env::temp_dir().join(format!("bz-arduino-{id}"));
    let sketch_dir = root.join("Sketch");
    let build_dir = root.join("build");
    fs::create_dir_all(&sketch_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&build_dir).map_err(|e| e.to_string())?;
    let ino = sketch_dir.join("Sketch.ino");
    fs::write(&ino, sketch).map_err(|e| e.to_string())?;
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
    let sim = Command::new("simavr").args(["-m", "atmega328p", "-f", "16000000"]).arg(&hex_path).output();
    let result = match sim {
        Ok(out) => format!("COMPILE SUCCESS\n{compile_log}\nSIMAVR OUTPUT\n{}{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => format!("COMPILE SUCCESS\n{compile_log}\nSIMULATION NOT RUN: simavr is not installed or not in PATH."),
        Err(e) => format!("COMPILE SUCCESS\n{compile_log}\nCould not start simavr: {e}")
    };
    let _ = fs::remove_dir_all(&root);
    Ok(result)
}
