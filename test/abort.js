var test = require('tape');
var esprima = require('esprima');
var codegen = require('escodegen');
var slowpoke = require('../');
var util = require('util');

var WHILE = 'while(true){}';
var FUNWHILE = '(function() { ' + WHILE + "})()";

function ta(msg, code) {

    test(msg, function(assert) {

        console.log(msg);

        code = code.replace('%w', WHILE).replace('%f', FUNWHILE);

        var ast = esprima.parse(code);

        // console.log(util.inspect(ast, {depth: null, colors: true}));

        slowpoke(ast, {timeout: 50});

        code = codegen.generate(ast);

        try {
            var now = Date.now();
            eval(code);
            assert.fail();
            assert.ok(Date.now() - now >= 50);
        } catch (e) {
            assert.ok(e.message === '---TOOSLOW---');
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
    'do - multi statement'      : 'var x = 0, y = 0; do { x++; y++; } while (true)',

    'array'                     : '[%f, 1, 2]',

    'tern - 1'                  : '%f ? 1 : 2',
    'tern - 2'                  : 'true ? %f : 2',
    'tern - 3'                  : 'false ? 1 : %f',

    'call'                      : '%f',
    'call args'                 : '(function(a,b,c) { b(); })(1, function() { %w }, 2)',

    'new'                       : 'new (function() { %w })',

    'bin op l'                  : '%f + 1',
    'bin op r'                  : '1 + %f',
    'logical exp l'             : '%f && 1',
    'logical exp r'             : '1 && %f',
    'variable'                  : 'var a = %f',
    'variable 2'                : 'var a = 1, b = %f',
    'assign'                    : 'var a; a = %f'

};

for (var k in cases) {
    ta(k, cases[k]);
}

for (var k in cases) {
    ta(k + ' (wrapped)', '(function() { ' + cases[k] + ' })()');
}
