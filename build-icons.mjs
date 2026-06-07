import sharp    from 'sharp';
import pngToIco from 'png-to-ico';
import fs       from 'fs';
import path     from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, 'assets');

// ── SVG source (paths only, no background rect) ───────────────────────────
// Original colours: dark = rgb(31,31,30)  light = rgb(255,255,255)
const DARK  = 'rgb(31,31,30)';
const LIGHT = 'rgb(255,255,255)';

// The two inner paths (paths 2–6 in original) without the background rect.
// Path order matters — later paths paint over earlier ones.
const pathsOriginal = `
<path fill="${DARK}"  d="M 1285.18 903.989 C 1282.1 903.014 1279.04 901.949 1276.02 900.796 C 1222.73 879.958 1176.37 835.203 1153.34 782.831 C 1128.74 727.334 1127.41 664.292 1149.65 607.808 C 1172.09 552.205 1215.43 507.615 1270.38 483.612 C 1324.78 460.104 1386.3 459.238 1441.35 481.204 C 1496.8 503.747 1541.07 547.318 1564.49 602.398 C 1587.95 658.962 1587.92 722.534 1564.43 779.079 C 1539.08 840.763 1492.73 879.205 1432.62 904.222 L 1495.17 904.115 C 1529.58 904.073 1559.51 901.495 1581.35 933.713 C 1595.76 954.962 1592.67 974.309 1593 998.676 C 1593.15 1010.18 1593 1021.82 1593.01 1033.34 L 1593.04 1170.69 L 1593.04 1294.18 C 1593.04 1311.15 1594.08 1348.19 1591.21 1362.62 L 1590.81 1363.9 C 1580.62 1395.99 1557.81 1413.15 1524.09 1413.32 C 1475.05 1413.56 1426 1413.41 1376.95 1413.44 L 1077.33 1413.4 L 809.586 1413.42 L 722.55 1413.49 C 664.052 1413.55 632.76 1421.98 593.952 1377.07 C 591.626 1374.38 568.231 1361.64 563.763 1359.12 L 331.547 1226.24 L 247.246 1177.57 C 239.749 1173.31 205.06 1155.78 202.055 1149.87 C 208.81 1143.81 243.439 1124.96 253.285 1119.39 L 354.962 1061.79 L 525.658 964.9 C 551.413 950.319 580.047 933.139 605.964 919.593 C 615.007 914.758 624.585 911 634.504 908.396 C 656.928 902.506 696.06 904.155 720.901 904.163 L 817.442 904.221 C 728.389 870.134 671.093 794.936 666.772 698.911 C 664.225 639.672 685.551 581.889 725.971 538.508 C 769.964 490.732 823.471 468.258 887.598 465.441 C 915.531 464.229 950.666 471.479 976.302 482.211 C 1031.59 505.573 1075.43 549.811 1098.29 605.311 C 1121.34 661.251 1120.83 724.128 1096.88 779.687 C 1070.45 840.953 1025.17 879.943 964.227 904.166 L 1163.28 904.208 C 1203.36 904.211 1245.23 904.828 1285.18 903.989 z"/>
<path fill="${LIGHT}" d="M 606.924 944.815 C 609.87 946.088 612.445 953.899 613.698 956.978 C 629.309 995.328 625.467 1042.76 604.852 1078.69 C 638.338 1127.44 637.705 1177.74 605.107 1226.58 C 628.778 1266.83 628.018 1315 609.972 1357.06 C 574.258 1337.78 535.18 1313.56 499.655 1292.97 L 377.135 1221.97 L 377.044 1075.7 C 406.062 1060.3 436.787 1041.92 465.466 1025.44 L 606.924 944.815 z"/>
<path fill="${LIGHT}" d="M 1352.5 601.701 C 1401.63 598.488 1444.09 635.664 1447.4 684.795 C 1450.71 733.926 1413.61 776.459 1364.49 779.861 C 1315.23 783.272 1272.56 746.054 1269.24 696.79 C 1265.93 647.526 1303.23 604.924 1352.5 601.701 z"/>
<path fill="${LIGHT}" d="M 886.131 601.578 C 935.143 599.018 977.024 636.519 979.872 685.515 C 982.72 734.512 945.466 776.612 896.487 779.748 C 847.099 782.91 804.571 745.277 801.699 695.872 C 798.827 646.466 836.709 604.16 886.131 601.578 z"/>
<path fill="${DARK}"  d="M 1809.31 918.013 C 1816.48 917.883 1820.68 919.508 1825.31 925.119 C 1828.29 938.466 1827.22 974.915 1827.2 990.492 L 1827.13 1097.54 L 1827.11 1281.71 C 1827.12 1312.26 1827.23 1342.81 1827.1 1373.37 C 1827.44 1383.74 1815.45 1392.24 1806.05 1387.25 C 1794.19 1380.96 1782.42 1372.82 1771.07 1365.52 L 1699.69 1319.55 C 1672.09 1301.03 1641.56 1281.99 1613.46 1264.19 C 1614.64 1246.43 1613.58 1214.14 1613.57 1195.62 L 1613.74 1042.08 C 1654.4 1014.27 1701.02 987.27 1742.45 959.776 C 1753.87 952.199 1799.03 921.897 1809.31 918.013 z"/>
`;

// Inverted: swap DARK ↔ LIGHT
const pathsInverted = pathsOriginal
  .replace(new RegExp(DARK,  'g'), '__TMP__')
  .replace(new RegExp(LIGHT, 'g'), DARK)
  .replace(/__TMP__/g, LIGHT);

// Brand blue — visible on both light and dark title bars
const BRAND_BLUE = '#2563eb';

function makeSvg(paths, bg) {
  const bgRect = bg ? `<rect width="2048" height="2048" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="2048" height="2048">${bgRect}${paths}</svg>`;
}

async function buildSet(svgStr, baseName) {
  const svgBuf = Buffer.from(svgStr);
  const png = path.join(dir, baseName + '.png');
  const ico = path.join(dir, baseName + '.ico');

  await sharp(svgBuf).resize(1024, 1024).png().toFile(png);
  console.log(`✓ ${baseName}.png`);

  const sizes = [16, 32, 48, 256];
  const bufs  = await Promise.all(sizes.map(s => sharp(svgBuf).resize(s, s).png().toBuffer()));
  fs.writeFileSync(ico, await pngToIco(bufs));
  console.log(`✓ ${baseName}.ico`);
}

// Both modes: dark logo on white background
await buildSet(makeSvg(pathsOriginal, '#ffffff'), 'icon');
await buildSet(makeSvg(pathsOriginal, '#ffffff'), 'icon-dark');

console.log('\nDone. Use icon.ico for light mode, icon-dark.ico for dark mode.');
