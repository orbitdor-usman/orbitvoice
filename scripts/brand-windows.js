const path = require('path');
module.exports = async ({ appOutDir, packager }) => {
  if (process.platform !== 'win32') return;
  const { rcedit } = await import('rcedit');
  const { version } = require('../package.json');
  await rcedit(path.join(appOutDir, `${packager.appInfo.productFilename}.exe`), {
    icon: path.join(__dirname, '..', 'electron', 'assets', 'orbitvoice.ico'),
    'file-version': version,
    'product-version': version,
    'version-string': { ProductName: 'Orbitvoice', FileDescription: 'Orbitvoice — Voice typing', CompanyName: 'Orbitdor', OriginalFilename: 'Orbitvoice.exe' }
  });
};
