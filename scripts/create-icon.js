const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'electron', 'assets', 'orbitvoice.png');
const target = path.join(__dirname, '..', 'electron', 'assets', 'orbitvoice.ico');
const png = fs.readFileSync(source);

// Windows ICO files may contain a PNG payload. This preserves the supplied logo
// without introducing a native image dependency into the desktop build.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // 0 means 256px
entry.writeUInt8(0, 1);
entry.writeUInt8(0, 2);
entry.writeUInt8(0, 3);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12);

fs.writeFileSync(target, Buffer.concat([header, entry, png]));
console.log(`Created ${target}`);
