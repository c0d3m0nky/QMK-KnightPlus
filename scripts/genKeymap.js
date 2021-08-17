var fs = require('fs');
var fsp = fs.promises;

let templates = {
    kb: {
        logicalCols: 15,
        rows: [
            15,
            {t: 14, e: [6]},
            15,
            15,
            {t: 14, e: [13]},
            {t: 13, e: [3, 8, 10]},
        ],
        template: ''
    },
    np: {
        logicalCols: 4,
        rows: [4, 4, 4, 4, 4, {t: 2, e: [1, 3]}],
        template: ''
    }
}

async function init() {
    templates['kb'].template = await fsp.readFile('./knightplus-keymap.c.tmpl', 'utf8');
    templates['np'].template = await fsp.readFile('./numpad-keymap.c.tmpl', 'utf8');
    module.exports.loaded = true;
}

function getKeyCode(keymap, li, kci) {
    let kc = keymap.layers[li][kci];
    let lio = li;

    while (kc === 'KC_TRNS') {
        lio--;

        if (lio < 0) {
            kc = 'KC_NO';
            break;
        }

        kc = keymap.layers[lio][kci];
    }

    if (kc.startsWith('ANY(')) kc = kc.replace(/any\(([^)]+)\)/gi,'$1');

    return kc;
}

// move this to a json file?
let colorMap = {
    KC_NO: 'KRGB_OFF',
    RESET: 'KRGB_DANGER',
    EEP_RST: 'KRGB_DANGER',
    DEBUG: 'KRGB_DEV2',
    RGB_VAI: 'KRGB_VAL',
    RGB_VAD: 'KRGB_VAL',
    KC_MPLY: 'KRGB_MEDIA',
    KC_VOLD: 'KRGB_MEDIA',
    KC_VOLU: 'KRGB_MEDIA',
    KC_MUTE: 'KRGB_MEDIA',
    M_LAMBDA: 'KRGB_DEV2',
    kb: {
        0: {
            0: {
                5: 'KRGB_DEV2',
                9: 'KRGB_DEV1',
                10: 'KRGB_DEV2',
                11: 'KRGB_DEV2',
                14: 'KRGB_MISNAMED'
            },
            2: { 14: 'KRGB_MISNAMED' },
            3: {
                0: 'KRGB_MISNAMED',
                1: 'KRGB_HOME',
                2: 'KRGB_HOME',
                3: 'KRGB_HOME',
                4: 'KRGB_HOME',
                8: 'KRGB_HOME',
                9: 'KRGB_HOME',
                10: 'KRGB_HOME',
                11: 'KRGB_HOME',
                14: 'KRGB_MISNAMED'
            },
            5: {
                0: 'KRGB_PORTAL1',
                9: 'KRGB_PORTAL2'
            }
        }
    }
}

function generate(template, keymap) {
    if (!module.exports.loaded) throw 'Templates not loaded';

    let dev = templates[template];
    let pinColorMap = colorMap[template] || {};
    let tmpl = dev.template;
    let rgbSeq = [];
    let layers = '';
    let rgbLayers = '';

    tmpl = tmpl.replace('%LayerSize%', keymap.layers.length);

    for (let li = 0; li < keymap.layers.length; li++) {
        let l = keymap.layers[li];
        let layer = [];
        let rgbLayer = [];
        let kci = 0;

        for (let ri = 0; ri < dev.rows.length; ri++) {
            let row = dev.rows[ri];
            let r = row.t || row;
            let layerRow = [];
            let rgbLayerRow = [];

            for (let ci = 0; ci < r && kci < l.length; ci++) {
                let kc = getKeyCode(keymap, li, kci);

                layerRow.push(kc);

                if (kc.startsWith('MO(')) rgbLayerRow.push('KRGB_FN');
                else if (colorMap[kc]) rgbLayerRow.push(colorMap[kc]);
                else if (pinColorMap[li] && pinColorMap[li][ri] && pinColorMap[li][ri][ci]) rgbLayerRow.push(pinColorMap[li][ri][ci]);
                else rgbLayerRow.push('KRGB_DEF');

                kci++;
            }
            layer.push(layerRow);
            rgbLayer.push(rgbLayerRow);
        }

        rgbSeq.push(toSeq(rgbLayer));

        let tabbed = toTabbedStr(dev, layer);
        let rgbTabbed = toTabbedStr(dev, rgbLayer);
        let layerStr = `[${li}] = LAYOUT(`;
        let rgbLayerStr = `[${li}] = RGBLAYOUT(`; //`[${li}] = {`;

        for (let ti = 0; ti < tabbed.length; ti++) {
            layerStr += `\n\t\t\t${tabbed[ti].trimEnd()},`;
            rgbLayerStr += `\n\t\t\t${rgbTabbed[ti].trimEnd()},`; //`\n\t\t\t{ ${rgbTabbed[ti]} },`;
        }

        layerStr = dropLastChar(layerStr) + '\n\t),';
        rgbLayerStr = dropLastChar(rgbLayerStr) + '\n\t),'; //dropLastChar(rgbLayerStr) + '\n\t},';

        layers += `\t${layerStr}\n`;
        rgbLayers += `\t${rgbLayerStr}\n`;
    }

    tmpl = tmpl.replace('%Layers%', dropLastChar(layers));
    tmpl = tmpl.replace('%RgbLayers%', dropLastChar(rgbLayers));

    return { template: tmpl, sequence: rgbSeq };
}

function toSeq(layer) {
    let seq = [];
    let prevVal = null;

    for (let ri = 0; ri < layer.length; ri++) {
        let row = layer[ri];

        for (let ci = 0; ci < row.length; ci++) {
            let val = row[ci];

            if (prevVal != val) {
                prevVal = val;
                seq.push([ri, ci, val]);
            }
        }
    }

    return seq;
}

function toTabbedStr(dev, arr) {
    let nullCell = '';

    let cols = [];
    const tabSize = 4;

    for (let ri = 0; ri < dev.rows.length; ri++) {
        let dr = dev.rows[ri];
        let r = dr.t ? {t: dr.t + dr.e.length, e: dr.e} : {t: dr, e: []};
        let arrValOffset = 0;

        for (let ci = 0; ci < r.t; ci++) {
            if (cols.length - 1 < ci) {
                let nc = {i: ci, cells: [], width: 0};

                for (let nci = 0; nci < ri; nci++) {
                    nc.cells.push('');
                }
                cols.push(nc);
            }

            let c = cols[ci];

            if (r.e.includes(ci)) {
                arrValOffset++;
                c.cells.push(null);
            } else {
                let v = arr[ri][ci - arrValOffset];
                let l = v.length;

                if (l > c.width) c.width = l;

                c.cells.push(v);
            }
        }
    }

    cols = cols.map(c => {
        c.width += 1;
        let m = c.width % tabSize;

        if (m === 0) c.width += tabSize;
        else c.width += m;

        return c;
    });

    let res = [];

    for (let ri = 0; ri < dev.rows.length; ri++) {
        let rstr = '';

        for (let ci = 0; ci < cols.length; ci++) {
            let c = cols[ci];
            let v = c.cells[ri];

            if (v === null) rstr += nullCell.padEnd(c.width, ' ');
            else if (v === '') rstr += ''.padEnd(c.width, ' ');
            else {
                v += ',';
                rstr += v.padEnd(c.width, ' ');
            }
        }
        rstr = dropLastChar(rstr);
        res.push(rstr);
    }

    return res;
}

function dropLastChar(str) {
    return str.replace(/(.+)[^\s](\s*?)$/gs, '$1$2');
}

module.exports = {
    init: init,
    loaded: false,
    generate: generate
}