const fs = require('fs');

let dev = 'kb';

let tmpl = require('./genKeymap.js');
let km = require(`../${dev}-base.json`);


tmpl.init()
    .then(_ =>{
        let c = tmpl.generate(dev, km);

        fs.writeFile(`../${dev}-keymap.c`, c.template, 'utf-8', e => {
            if(e) console.error(`keymap.c failed: ${e}`);
        });
        let seqStr = '[';

        for (let li = 0; li < c.sequence.length; li++) {
            let layer = c.sequence[li];

            seqStr += '\n\t[';

            for (let si = 0; si < layer.length; si++) {
                seqStr += `\n\t\t${JSON.stringify(layer[si])},`;
            }
            seqStr = seqStr.substr(0, seqStr.length - 1) + '\n\t],';
        }

        seqStr = seqStr.substr(0, seqStr.length - 1) + '\n]';

        fs.writeFile(`../${dev}-rgbseq.json`, seqStr, 'utf-8', e => {
            if(e) console.error(`rgbseq.json failed: ${e}`);
        });
    });