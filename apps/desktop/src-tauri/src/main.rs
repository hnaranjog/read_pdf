// Previene una ventana de consola adicional en Windows en release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    readpdf_lib::run()
}
