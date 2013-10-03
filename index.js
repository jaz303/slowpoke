module.exports = slowpoke;

function slowpoke(ast, options) {

    options = options || {};

    var timeout = (typeof options.timeout === 'number') ? options.timeout : 5000;
    var nextTimerId = 1;

    function isLoop(node) {
        return node.type === 'WhileStatement'
                || node.type === 'ForStatement'
                || node.type === 'ForInStatement'
                || node.type === 'DoWhileStatement';
    }

    function generateSetupCode(timerName, counterName) {
        return {
            type: 'DirectiveStatement',
            raw: "var " + timerName + " = Date.now(), " + counterName + " = 0"
        };
    }

    function modifyLoopBody(node, timerName, counterName) {

        var timerCheck = {
            type: 'DirectiveStatement',
            raw: [
                "if ((" + counterName + "++) & 1024) {",
                "  if ((Date.now() - " + timerName + ") > " + timeout + ") throw new Error('---TOOSLOW---');",
                "}"
            ].join("\n")
        };

        if (node.body.type === 'BlockStatement') {
            node.body.body.push(timerCheck);
        } else {
            node.body = {
                type: 'BlockStatement',
                body: [ node.body, timerCheck ]
            }
        }

    }
    
    function walkList(ary) {
        for (var i = 0, l = ary.length; i < l; ++i) {
            var child = ary[i];
            if (isLoop(child)) {
                var timerId     = nextTimerId++,
                    timerName   = '$__slowpokeWhileTimer__' + timerId,
                    counterName = '$__slowpokeWhileCounter__' + timerId;

                ary.splice(i, 0, generateSetupCode(timerName, counterName));
                i++;

                modifyLoopBody(child, timerName, counterName);
            }
            walk(child);
        }
    }

    function walkNodeWithBody(node, k) {
        if (isLoop(node[k])) {

            var timerId     = nextTimerId++,
                timerName   = '$__slowpokeWhileTimer__' + timerId,
                counterName = '$__slowpokeWhileCounter__' + timerId;

            var block = {
                type: 'BlockStatement',
                body: [
                    generateSetupCode(timerName, counterName),
                    node[k]
                ]
            };

            modifyLoopBody(node.body.body, timerName, counterName);

            node[k] = block;

            walk(node[k].body[1]);

        } else {
            walk(node[k]);    
        }
    }

    function walk(node) {
        switch (node.type) {
            case 'ForStatement':
            case 'ForInStatement':
            case 'WhileStatement':
            case 'DoWhileStatement':
            case 'WithStatement':
            case 'FunctionExpression':
            case 'FunctionDeclaration':
                walkNodeWithBody(node, 'body');
                break;
            case 'IfStatement':
                walkNodeWithBody(node, 'consequent');
                if (node.alternate) {
                    walkNodeWithBody(node, 'alternate');    
                }
                break;
            case 'ExpressionStatement':
                walk(node.expression);
                break;
            case 'CallExpression':
                walk(node.callee);
                break;
            case 'BlockStatement':
                walkList(node.body);
                break;
            case 'SwitchCase':
                walkList(node.consequent);
                break;
            case 'TryStatement':
                // TODO!!!
                break;
            default:
                // do nothing
        }

    }

    walkList(ast.body);

    return ast;

}
