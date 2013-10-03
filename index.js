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
            case 'AssignmentExpression':
                walk(node.left);
                walk(node.right);
                break;
            case 'ArrayPattern':
            case 'ArrayExpression':
                walkList(node.elements);
                break;
            case 'ArrowFunctionExpression':
                // TODO!
                break;
            case 'BlockStatement':
                walkList(node.body);
                break;
            case 'BinaryExpression':
            case 'LogicalExpression':
                walk(node.left);
                walk(node.right);
                break;
            case 'CallExpression':
                walk(node.callee);
                walkList(node.arguments);
                break;
            case 'CatchClause':
                walkNodeWithBody(node, 'body');
                break;
            case 'ComprehensionBlock':
            case 'ComprehensionExpression':
                // TODO!
                break;
            case 'ConditionalExpression':
                walk(node.test);
                walk(node.consequent);
                walk(node.alternate);
                break;
            case 'DoWhileStatement':
                walkNodeWithBody(node, 'body');
                walk(node.test);
                break;
            case 'ExpressionStatement':
                walk(node.expression);
                break;
            case 'ForStatement':
                node.init && walk(node.init);
                node.test && walk(node.test);
                node.update && walk(node.update);
                walkNodeWithBody(node, 'body');
                break;
            case 'ForInStatement':
                walk(node.right);
                walkNodeWithBody(node, 'body');
                break;
            case 'FunctionDeclaration':
            case 'FunctionExpression':
                walkNodeWithBody(node, 'body');
                break;
            case 'IfStatement':
                walk(node.test);
                walkNodeWithBody(node, 'consequent');
                if (node.alternate) {
                    walkNodeWithBody(node, 'alternate');    
                }
                break;
            case 'LabeledStatement':
                walkNodeWithBody(node, 'body');
                break;
            case 'MemberExpression':
                walk(node.object);
                node.computed && walk(node.property);
                break;
            case 'NewExpression':
                walk(node.callee);
                break;
            case 'ObjectExpression':
                walkList(node.properties);
                break;
            case 'ObjectPattern':
                // TODO!
                break;
            case 'Program':
                walkList(node.body);
                break;
            case 'Property':
                walk(node.value);
                break;
            case 'ReturnStatement':
            case 'ThrowStatement':
            case 'UnaryExpression':
            case 'UpdateExpression':
            case 'YieldExpression':
                walk(node.argument);
                break;
            case 'SequenceExpression':
                walkList(node.expressions);
                break;
            case 'SwitchStatement':
                walk(node.discriminant);
                walkList(node.cases);
                break;
            case 'SwitchCase':
                // TODO: not sure if this is strictly correct!
                walkList(node.consequent);
                break;
            case 'TryStatement':
                walk(node.block);
                walkList(node.handlers);
                if (node.finalizer) {
                    walkNodeWithBody(node, 'finalizer');
                }
                break;
            case 'VariableDeclaration':
                walkList(node.declarations);
                break;
            case 'VariableDeclarator':
                node.init && walk(node.init);
                break;
            case 'WhileStatement':
                walk(node.test);
                walkNodeWithBody(node, 'body');
                break;
            case 'WithStatement':
                walk(node.object);
                walkNodeWithBody(node, 'body');
                break;

            // Don't worry about these ones
            case 'BreakStatement':
            case 'ContinueStatement':
            case 'DirectiveStatement':
            case 'DebuggerStatement':
            case 'EmptyStatement':
            case 'Identifier':
            case 'Literal':
            case 'ThisExpression':
                break;

            default:
                throw new Error("unknown node type: " + node.type);
        }

    }

    walk(ast);

    return ast;

}
