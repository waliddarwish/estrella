class MathParser {
    constructor() {
      // Define operators and their precedence
      this.operators = {
        '+': { precedence: 1, fn: (a, b) => a + b },
        '-': { precedence: 1, fn: (a, b) => a - b },
        '*': { precedence: 2, fn: (a, b) => a * b },
        '/': { precedence: 2, fn: (a, b) => a / b },
        '^': { precedence: 3, fn: (a, b) => Math.pow(a, b), rightAssociative: true },
        'implicit*': { precedence: 2, fn: (a, b) => a * b } // For implicit multiplication
      };
  
      // Define supported functions
      this.functions = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        sqrt: Math.sqrt,
        log: Math.log,
        abs: Math.abs,
        exp: Math.exp,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round
      };
  
      // Define constants
      this.constants = {
        pi: Math.PI,
        e: Math.E
      };
    }
  
    // Main evaluation function
    evaluate(expression, variables = {}) {
      const tokens = this.tokenize(expression);
      const tokensWithImplicitMult = this.addImplicitMultiplication(tokens);
      const rpn = this.shuntingYard(tokensWithImplicitMult);
      return this.evaluateRPN(rpn, variables);
    }
  
    // Tokenize the input string
    tokenize(expression) {
      // Updated regex to better handle implicit multiplication cases
      const regex = /\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?|[a-zA-Z][a-zA-Z0-9]*|[-+*/^()])\s*/g;
      const tokens = [];
      let match;
      
      while ((match = regex.exec(expression))) {
        if (match[1]) {
          tokens.push(match[1]);
        }
      }
      
      return tokens;
    }
  
    // Add implicit multiplication tokens where needed
    addImplicitMultiplication(tokens) {
      const newTokens = [];
      
      for (let i = 0; i < tokens.length; i++) {
        newTokens.push(tokens[i]);
        
        // Check if we need to insert implicit multiplication
        if (i < tokens.length - 1) {
          const current = tokens[i];
          const next = tokens[i + 1];
          
          const casesWhereMultNeeded = [
            // Number followed by variable: 2x → 2*x
            () => this.isNumber(current) && this.isVariable(next),
            // Number followed by function: 2sin(x) → 2*sin(x)
            () => this.isNumber(current) && this.isFunction(next),
            // Number followed by opening paren: 2(x+1) → 2*(x+1)
            () => this.isNumber(current) && next === '(',
            // Variable followed by number: x2 → x*2 (if you want this)
            () => this.isVariable(current) && this.isNumber(next),
            // Variable followed by function: xsin(y) → x*sin(y)
            () => this.isVariable(current) && this.isFunction(next),
            // Variable followed by opening paren: x(y+1) → x*(y+1)
            () => this.isVariable(current) && next === '(',
            // Closing paren followed by number: (x+1)2 → (x+1)*2
            () => current === ')' && this.isNumber(next),
            // Closing paren followed by variable: (x+1)y → (x+1)*y
            () => current === ')' && this.isVariable(next),
            // Closing paren followed by function: (x+1)sin(y) → (x+1)*sin(y)
            () => current === ')' && this.isFunction(next),
            // Closing paren followed by opening paren: (x+1)(y+1) → (x+1)*(y+1)
            () => current === ')' && next === '('
          ];
          
          if (casesWhereMultNeeded.some(fn => fn())) {
            newTokens.push('*');
          }
        }
      }
      
      return newTokens;
    }
  
    // Convert infix to RPN using Shunting-yard algorithm
    shuntingYard(tokens) {
      const output = [];
      const operatorStack = [];
      
      for (const token of tokens) {
        if (this.isNumber(token)) {
          output.push({ type: 'number', value: parseFloat(token) });
        } else if (this.isVariable(token)) {
          output.push({ type: 'variable', name: token });
        } else if (this.isFunction(token)) {
          operatorStack.push({ type: 'function', name: token });
        } else if (token === '(') {
          operatorStack.push({ type: 'paren', value: '(' });
        } else if (token === ')') {
          while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== '(') {
            output.push(operatorStack.pop());
          }
          operatorStack.pop(); // Remove the '('
          if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'function') {
            output.push(operatorStack.pop());
          }
        } else if (this.isOperator(token)) {
          const op1 = this.operators[token];
          while (operatorStack.length > 0) {
            const op2 = operatorStack[operatorStack.length - 1];
            if (op2.type !== 'operator') break;
            
            if ((!op1.rightAssociative && op1.precedence <= op2.precedence) ||
                (op1.rightAssociative && op1.precedence < op2.precedence)) {
              output.push(operatorStack.pop());
            } else {
              break;
            }
          }
          operatorStack.push({ type: 'operator', value: token, ...op1 });
        }
      }
      
      while (operatorStack.length > 0) {
        output.push(operatorStack.pop());
      }
      
      return output;
    }
  
    // Evaluate the RPN expression
    evaluateRPN(rpn, variables) {
      const stack = [];
      
      for (const token of rpn) {
        if (token.type === 'number') {
          stack.push(token.value);
        } else if (token.type === 'variable') {
          if (token.name in this.constants) {
            stack.push(this.constants[token.name]);
          } else if (token.name in variables) {
            stack.push(variables[token.name]);
          } else {
            throw new Error(`Undefined variable: ${token.name}`);
          }
        } else if (token.type === 'operator') {
          if (stack.length < 2) throw new Error('Insufficient operands');
          const b = stack.pop();
          const a = stack.pop();
          stack.push(token.fn(a, b));
        } else if (token.type === 'function') {
          if (stack.length < 1) throw new Error('Insufficient operands');
          const arg = stack.pop();
          stack.push(this.functions[token.name](arg));
        }
      }
      
      if (stack.length !== 1) throw new Error('Invalid expression');
      return stack[0];
    }
  
    // Helper methods
    isNumber(token) {
      return /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(token);
    }
  
    isVariable(token) {
      return /^[a-zA-Z][a-zA-Z0-9]*$/.test(token) && 
             !this.isFunction(token) && 
             !(token in this.constants);
    }
  
    isFunction(token) {
      return token in this.functions;
    }
  
    isOperator(token) {
      return token in this.operators;
    }
  }