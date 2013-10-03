var test = require('tape');
var esprima = require('esprima');
var codegen = require('escodegen');
var slowpoke = require('../');
var util = require('util');

function ta(msg, code) {

    test(msg, function(assert) {

        console.log(msg);

        var ast = esprima.parse(code);

        // console.log(util.inspect(ast, {depth: null, colors: true}));

        slowpoke(ast, {timeout: 2000});

        code = codegen.generate(ast);

        try {
            var now = Date.now();
            eval(code);
            assert.fail();
            assert.ok(Date.now() - now >= 2000);
        } catch (e) {
            console.log(e.message);
            assert.pass();
        }

        assert.end();

    });

}

var cases = {
    'while - empty'             : 'while (true);',
    'while - empty block'       : 'while (true) {}',
    'while - single statement'  : 'var x = 0; while (true) x++;',
    'while - multi statement'   : 'var x = 0, y = 0; while (true) { x++; y++; }',

    'for - empty'               : 'for (var i = 0; i < 1; i = i);',
    'for - empty block'         : 'for (var i = 0; i < 1; i = i) {}',
    'for - single statement'    : 'var x = 0; for (var i = 0; i < 1; i = i) x++;',
    'for - multi statement'     : 'var x = 0, y = 0; for (var i = 0; i < 1; i = i) { x++; y++; }',

    'do - empty'                : 'do ; while (true)',
    'do - empty block'          : 'do {} while (true)',
    'do - single statement'     : 'var x = 0; do x++; while (true)',
    'do - multi statement'      : 'var x = 0, y = 0; do { x++; y++; } while (true)'
};

for (var k in cases) {
    ta(k, cases[k]);
}

for (var k in cases) {
    ta(k + ' (wrapped)', '(function() { ' + cases[k] + ' })()');
}
