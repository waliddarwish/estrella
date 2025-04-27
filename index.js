const express = require('express');
const app = express();
const port = 3000;

// Import both parsers
const MathParser = require('./MathParser');
const math = require('mathjs');

const parser = new MathParser();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.post('/plot', (req, res) => {
    const { expression, useMathParser } = req.body;

    if (!expression) {
        return res.status(400).send('No expression provided');
    }

    try {
        let points = [];

        if (useMathParser) {
            // Use your custom MathParser
            for (let x = -10; x <= 10; x += 1) {
                for (let y = -10; y <= 10; y += 1) {
                    let scope = { x, y };
                    let z = parser.evaluate(expression, scope);
                    points.push({ x, y, z });
                }
            }
        } else {
            // Use mathjs
            const compiled = math.compile(expression);

            for (let x = -10; x <= 10; x += 1) {
                for (let y = -10; y <= 10; y += 1) {
                    let scope = { x, y };
                    let z = compiled.evaluate(scope);
                    points.push({ x, y, z });
                }
            }
        }

        res.json(points);

    } catch (error) {
        console.error(error);
        res.status(400).send('Invalid expression: ' + error.message);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
