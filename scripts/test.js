const fs = require('fs');

let dev = 'kb';

let tmpl = require('./genKeymap.js');
let km = require(`../${dev}-base.json`);


tmpl.init()
    .then(_ =>{
        let c = tmpl.generate(dev, km);

        fs.writeFile(`../${dev}-keymap.c`, c, 'utf-8', e => {
            if(e) console.error(e);
        });
    });