"""Exact joint-probability enumeration for the belief-update normalization claim."""
from fractions import Fraction as Q
from itertools import product


def matrices(alpha, x):
    beta, y = (1 - alpha) / 2, 1 - 2 * x
    return (
        ((alpha*y, beta*x, beta*x), (alpha*x, beta*y, beta*x), (alpha*x, beta*x, beta*y)),
        ((beta*y, alpha*x, beta*x), (beta*x, alpha*y, beta*x), (beta*x, alpha*x, beta*y)),
        ((beta*y, beta*x, alpha*x), (beta*x, beta*y, alpha*x), (beta*x, beta*x, alpha*y)),
    )


def enumerate_joint(ms, observed):
    """Sum every hidden-state trajectory, retaining its final hidden state."""
    joint = [Q(0)] * 3
    for states in product(range(3), repeat=len(observed) + 1):
        probability = Q(1, 3)
        for t, token in enumerate(observed):
            probability *= ms[token][states[t]][states[t + 1]]
        joint[states[-1]] += probability
    return joint


def posterior(ms, observations):
    joint = enumerate_joint(ms, observations)
    return [value / sum(joint) for value in joint]


ms = matrices(Q(3, 5), Q(3, 20))
row_mixture = [sum(ms[0][i][j] / sum(ms[0][i]) for i in range(3)) / 3 for j in range(3)]
bayesian = posterior(ms, (0,))
assert bayesian == [Q(3, 5), Q(1, 5), Q(1, 5)]
assert row_mixture == [Q(163, 312), Q(149, 624), Q(149, 624)]
print("One-observation posterior:", bayesian)
print("Mixture of row-conditionals:", row_mixture)

# Verify homothety for every token, then every context of lengths one to five.
pi, decay, factor = Q(1, 3), Q(11, 20), Q(295, 416)
right, wrong = {}, {}
for token in range(3):
    right[token] = [v - pi for v in posterior(ms, (token,))]
    wrong[token] = [sum(ms[token][i][j] / sum(ms[token][i]) for i in range(3))/3-pi for j in range(3)]
    assert wrong[token] == [factor * v for v in right[token]]
for length in range(1, 6):
    for sequence in product(range(3), repeat=length):
        for coordinate in range(3):
            corrected = sum(decay**(length-1-i) * right[z][coordinate] for i, z in enumerate(sequence))
            printed = sum(decay**(length-1-i) * wrong[z][coordinate] for i, z in enumerate(sequence))
            assert printed == factor * corrected
print("Common centred scale 295/416 verified for all 363 contexts of lengths 1–5.")

print("All normalization checks passed. Negative coordinates are not treated as a paper error.")
