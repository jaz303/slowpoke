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
        } catch (e) {
            assert.ok(e.message === '---TOOSLOW---');
            assert.ok(Date.now() - now >= 50);
        }

        assert.end();

    });

}

var cases = {

    // assign
    'assign 1'                  : 'var a; a = %f',
    'assign 2'                  : 'var a = []; a[%f] = 10',

    // array
    'array'                     : '[%f, 1, 2]',

    // bin exp
    'bin op l'                  : '%f + 1',
    'bin op r'                  : '1 + %f',

    // logical op
    'logical exp l'             : '%f && 1',
    'logical exp r'             : '1 && %f',

    // call
    'call'                      : '%f',
    'call 2'                    : '(function() { return function() { %w; } })()()',
    'call args'                 : '(function(a,b,c) { b(); })(1, function() { %w }, 2)',

    // catch
    'catch'                     : 'try { throw "boom"; } catch (e) { %w }',

    // conditional
    'tern - 1'                  : '%f ? 1 : 2',
    'tern - 2'                  : 'true ? %f : 2',
    'tern - 3'                  : 'false ? 1 : %f',

    // do-while
    'do - empty'                : 'do ; while (true)',
    'do - empty block'          : 'do {} while (true)',
    'do - single statement'     : 'var x = 0; do x++; while (true)',
    'do - multi statement'      : 'var x = 0, y = 0; do { x++; y++; } while (true)',

    // for
    'for - empty'               : 'for (var i = 0; i < 1; i = i);',
    'for - empty block'         : 'for (var i = 0; i < 1; i = i) {}',
    'for - single statement'    : 'var x = 0; for (var i = 0; i < 1; i = i) x++;',
    'for - multi statement'     : 'var x = 0, y = 0; for (var i = 0; i < 1; i = i) { x++; y++; }',

    // function
    'fun'                       : 'function _test() { %w }; _test();',

    // if
    'if - 1'                    : 'if (%f) { }',
    'if - 2'                    : 'if (true) { %w }',
    'if - 3'                    : 'if (false) { } else { %w }',

    // TODO: labeled statement
    
    // member expression
    'member exp - 1'            : '%f[0]',
    'member exp - 2'            : 'var ary = []; ary[%f];',

    // new
    'new'                       : 'new (function() { %w })',

    // object + properties
    'object - 1'                : '{foo: %f}',
    'object - 2'                : '({a: 1, b: 2, foo: %f, c: 3})',
    
    // return
    'return'                    : '(function() { return %f })();',

    // throw
    'throw'                     : 'throw %f;',

    // unary
    'unary'                     : '-%f',

    // TODO: update
    // TODO: yield

    // sequence
    'sequence'                  : '1,2,%f;',

    // switch
    'switch - 1'                : 'var a = 1; switch (a) { case 1: %w; break; }',
    'switch - 2'                : 'var a = 1; switch (a) { case 0: break; case 1: a++; %w; a--; break; }',
    'switch - 3'                : 'var a = 0; switch (a) { case 0: case 1: %w; break; case 2: break; }',

    // try
    'try'                       : 'try { %f; } catch (e) { throw e; }',

    // variable
    'variable'                  : 'var a = %f',
    'variable 2'                : 'var a = 1, b = %f',

    // while
    'while - empty'             : 'while (true);',
    'while - empty block'       : 'while (true) {}',
    'while - single statement'  : 'var x = 0; while (true) x++;',
    'while - multi statement'   : 'var x = 0, y = 0; while (true) { x++; y++; }',

    // with
    'with - 1'                  : 'with (%f) { }',
    'with - 2'                  : 'with ({}) { %f }'

};

for (var k in cases) {
    ta(k, cases[k]);
}

for (var k in cases) {
    ta(k + ' (wrapped)', '(function() { ' + cases[k] + ' })()');
}

test('return with no arg does not throw exception', function(assert) {

    var ast = esprima.parse('function foo() { return; }');

    try {
        slowpoke(ast);
        assert.pass();
    } catch (e) {
        assert.fail();
    }
    assert.end();
    
});