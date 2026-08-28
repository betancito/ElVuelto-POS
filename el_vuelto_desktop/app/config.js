'use strict'
// Dos configuraciones distintas, a propósito:
//  - la HORNEADA (config.json, la escribe build.py al generar): a qué negocio y
//    a qué servidor apunta este binario. No cambia en la máquina del cajero.
//  - la DEL USUARIO (<userData>/config.json): la impresora que eligió el cajero.
//    Vive fuera del paquete porque el generador no puede conocerla.
const fs = require('node:fs')
const path = require('node:path')
const { app } = require('electron')

const DEFAULTS = {
  env: 'test',
  baseUrl: '', // sin default a propósito: el servidor vive en otra máquina de la red
  slug: '',
  displayName: '',
}

function bakedConfig() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // Sin config horneada = corrida suelta (`npm start`), no un .exe generado.
    // ELVUELTO_BASE_URL / ELVUELTO_SLUG permiten apuntarlo sin reempaquetar.
    return {
      ...DEFAULTS,
      baseUrl: process.env.ELVUELTO_BASE_URL || DEFAULTS.baseUrl,
      slug: process.env.ELVUELTO_SLUG || DEFAULTS.slug,
    }
  }
}

function userConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function readUserConfig() {
  try {
    return JSON.parse(fs.readFileSync(userConfigPath(), 'utf8'))
  } catch {
    return {}
  }
}

function writeUserConfig(patch) {
  const next = { ...readUserConfig(), ...patch }
  fs.mkdirSync(path.dirname(userConfigPath()), { recursive: true })
  fs.writeFileSync(userConfigPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

module.exports = { bakedConfig, readUserConfig, writeUserConfig, userConfigPath }
