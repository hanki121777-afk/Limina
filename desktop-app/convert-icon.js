import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';

const pngPath = path.resolve('build/installer-icon.png');
const icoPath = path.resolve('build/installer-icon.ico');

pngToIco(pngPath)
  .then(buf => {
    fs.writeFileSync(icoPath, buf);
    console.log('Successfully converted installer-icon.png to installer-icon.ico');
  })
  .catch(err => {
    console.error('Error converting icon:', err);
  });
