var test = require('tape');
var esprima = require('esprima');
var codegen = require('escodegen');
var slowpoke = require('../');


function ta(msg, code) {

    test(msg, function(assert) {

        var ast = esprima.parse(code);

        slowpoke(ast, {timeout: 2000});

        code = codegen.generate(ast);

        try {
            var now = Date.now();
            eval(code);
            assert.fail();
            assert.ok(Date.now() - now >= 2000);
        } catch (e) {
            assert.pass();
        }

        assert.end();

    });

}

ta('while loop aborts', 'while (true) {}');
ta('nested while loop aborts', 'var i = 0; while (i < 10) { while (true) {}; i++; }');
ta('for loop aborts', 'for (var i = 0; i < 1; i = i) {}');
ta('do loop aborts', 'do {} while (true)');
