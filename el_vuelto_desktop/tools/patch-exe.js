'use strict'
// Le mete el ícono y los metadatos de El Vuelto al .exe empaquetado.
// `resedit` es JavaScript puro: hace lo mismo que `rcedit` SIN necesitar wine
// ni una máquina Windows, que es lo que permite generar la beta desde el Mac.
//
// Uso: node build/patch-exe.js <ruta.exe> <ruta.ico> <productName> <version>
const fs = require('node:fs')
const ResEdit = require('resedit')

const [exePath, icoPath, productName, version] = process.argv.slice(2)
if (!exePath || !icoPath) {
  console.error('uso: node patch-exe.js <exe> <ico> [productName] [version]')
  process.exit(1)
}

const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath))
const res = ResEdit.NtExecutableResource.from(exe)

// Ícono (el que ve Windows en el Explorador, la barra de tareas y el acceso directo)
const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath))
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  res.entries, 1, 1033, iconFile.icons.map((i) => i.data),
)

// Metadatos (los que se ven en Propiedades → Detalles)
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0]
if (vi) {
  const v = String(version || '0.1.0').split('.').map((n) => parseInt(n, 10) || 0)
  while (v.length < 4) v.push(0)
  vi.setFileVersion(v[0], v[1], v[2], v[3], 1033)
  vi.setProductVersion(v[0], v[1], v[2], v[3], 1033)
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    CompanyName: 'El Vuelto',
    ProductName: productName || 'El Vuelto POS',
    FileDescription: productName || 'El Vuelto — Caja',
    LegalCopyright: '© El Vuelto',
    OriginalFilename: exePath.split('/').pop(),
  })
  vi.outputToResourceEntries(res.entries)
}

res.outputResource(exe)
fs.writeFileSync(exePath, Buffer.from(exe.generate()))

// Re-parsear es la prueba de que no quedó corrupto.
const check = ResEdit.NtExecutableResource.from(ResEdit.NtExecutable.from(fs.readFileSync(exePath)))
const iconos = check.entries.filter((e) => e.type === 3).length
console.log(`   ícono + metadatos escritos (RT_ICON: ${iconos}) — PE re-parseado OK`)
