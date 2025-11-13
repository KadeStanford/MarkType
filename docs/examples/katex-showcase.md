---
# KaTeX Showcase

This document demonstrates a variety of KaTeX/LaTeX math examples you can insert into MarkType. Each example shows the rendered math (if your preview supports KaTeX).
---

## Inline Math

A simple inline expression: $e^{i\pi} + 1 = 0$.

---

## Display Math

A centered display formula:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

---

## Fractions and Roots

Fraction and nested fractions:

$$
\frac{1}{1 + \frac{1}{2 + \frac{1}{3}}}
$$

Square root and nth root:

$$
\sqrt{\frac{a}{b}}, \quad \sqrt[n]{x}
$$

---

## Sums, Products, and Limits

Summation, product, and limit notation:

$$
\sum_{n=0}^{\infty} \frac{x^n}{n!} = e^{x}, \qquad \prod_{k=1}^n k = n!, \qquad \lim_{x \to 0} \frac{\sin x}{x} = 1
$$

---

## Integrals and Calculus

Definite and multiple integrals, partial derivatives, nabla operator:

$$
\iint_{D} f(x,y) \, dA, \quad \frac{\partial}{\partial x} \left( \frac{\partial f}{\partial y} \right), \quad \nabla \cdot \mathbf{F}
$$

---

## Matrices and Linear Algebra

Small matrix and determinant examples:

$$
A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \qquad \det A = -2
$$

A block matrix and row vector:

$$
\begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}, \quad \mathbf{v} = \begin{bmatrix} x \\ y \end{bmatrix}
$$

Use `aligned` or `align` environments for aligned equations:

$$
\begin{aligned}
  a + b &= c \\\\
  d + e &= f
\end{aligned}
$$

---

## Cases / Piecewise Definitions

Piecewise functions using `cases`:

$$
f(x) = \begin{cases}
  x^2 & x \ge 0 \\\\
  -x & x < 0
\end{cases}
$$

---

## Greek Letters & Symbols

Common letters and relations:

$$
\alpha, \beta, \gamma, \pi, \sigma, \Omega, \le, \ge, \approx, \neq
$$

---

## Inline Math

A simple inline expression: $e^{i\pi} + 1 = 0$.

---

## Display Math

A centered display formula:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

---

## Fractions and Roots

Fraction and nested fractions:

$$
\frac{1}{1 + \frac{1}{2 + \frac{1}{3}}}
$$

Square root and nth root:

$$
\sqrt{\frac{a}{b}}, \quad \sqrt[n]{x}
$$

---

## Sums, Products, and Limits

Summation, product, and limit notation:

$$
\sum_{n=0}^{\infty} \frac{x^n}{n!} = e^{x}, \qquad \prod_{k=1}^n k = n!, \qquad \lim_{x \to 0} \frac{\sin x}{x} = 1
$$

---

## Integrals and Calculus

Definite and multiple integrals, partial derivatives, nabla operator:

$$
\iint_{D} f(x,y) \, dA, \quad \frac{\partial}{\partial x} \left( \frac{\partial f}{\partial y} \right), \quad \nabla \cdot \mathbf{F}
$$

---

## Matrices and Linear Algebra

Small matrix and determinant examples:

$$
A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \qquad \det A = -2
$$

A block matrix and row vector:

$$
\begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}, \quad \mathbf{v} = \begin{bmatrix} x \\ y \end{bmatrix}
$$

---

## Align (systems / multi-line equations)

Use `aligned` or `align` environments for aligned equations:

$$
\begin{aligned}
  a + b &= c \\\\
  d + e &= f
\end{aligned}
$$

---

## Cases / Piecewise Definitions

Piecewise functions using `cases`:

$$
f(x) = \begin{cases}
  x^2 & x \ge 0 \\\\
  -x & x < 0
\end{cases}
$$

---

## Greek Letters & Symbols

Common letters and relations:

$$
\alpha, \beta, \gamma, \pi, \sigma, \Omega, \le, \ge, \approx, \neq
$$

---

## Delimiters and Scalable Brackets

Use `\left` / `\right` for scalable delimiters:

$$
\left( \frac{1}{n} \right)_{n=1}^{\infty}, \quad \left\lVert v \right\rVert
$$

---

## Text in Math

Use `\text{...}` to insert normal text inside math mode:

$$
	ext{if } x \ge 0 \text{ then } f(x) = x^2
$$

---

## Large Example

A more complete example combining several features:

$$
\begin{aligned}
  S &= \sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}, \\\\
  	ext{so } \int_0^{\infty} \frac{\sin x}{x} \, dx &= \frac{\pi}{2}.
\end{aligned}
$$

---
