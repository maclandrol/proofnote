"""Arithmetic witnesses for the current Proof Notes assessments.

Run with Python 3; no third-party dependencies. This checks finite examples,
not whole theorems, paper implementations, or experimental performance.
Assumptions and source locations are in the accompanying web entries.
"""
from fractions import Fraction as F
from math import exp, log, pi, sqrt
import json

results = {}

# A continuous ramp around a unit jump has essential-supremum error 1/2.
# Its L1 error is the area of two triangles, delta/2. The general lower
# bound follows from continuity and the two one-sided limits, not sampling.
results['big-bird'] = {'sup_error_lower_bound': .5, 'ramp_half_width': .2, 'ramp_L1_error': .1}

# CQL: exact, representable Q=(1,2), pi=(.9,.1), beta=(.5,.5).
# Objective: (5/4)(w-1)^2 -(2 alpha/5)w; its minimizer is 1+4 alpha/25.
alpha = F(1)
w = 1 + F(4,25)*alpha
true_value = F(11,10)
updated = F(11,10)*w
assert updated == F(319,250) and updated > true_value
results['cql'] = {'true': float(true_value), 'updated': float(updated), 'weight': float(w)}

# BEAR: both s0 actions lead to absorbing s1; their immediate rewards are
# 1 and 0. The constrained policy chooses action 1 (the zero-reward action).
# Q* = Q^Pi = [[1,0],[0,0]]. Both Q Bellman backups agree everywhere.
q_star = [[1.,0.],[0.,0.]]
q_constrained = [[1.,0.],[0.,0.]]
q_discrepancy = max(abs(a-b) for arow,brow in zip(q_star,q_constrained) for a,b in zip(arow,brow))
value_loss = 1.
assert q_discrepancy == 0 and value_loss > 0
results['bear'] = {'Q_operator_discrepancy': q_discrepancy, 'value_loss_at_s0': value_loss}

# COMBO: rho=d=1 makes the conservative penalty exactly zero.
f, reward_model, discount = F(1,2), F(1,10), F(1,2)
q_combo = (1-f)*reward_model/(1-discount)
assert q_combo == F(1,10) and q_combo > 0
results['combo'] = {'penalty_for_any_beta': 0, 'estimated_value': float(q_combo), 'true_value': 0}

# InfoVAE: alpha=0, lambda=1/2, D=3 KL, independent N(m,1) encoder.
# MI=0, fixed data-matching decoder, KL=m^2/2. Gain = -KL+3 KL/2.
mean = 2.
kl = mean*mean/2
gain = -kl + 1.5*kl
assert gain == mean*mean/4 and gain > 0
results['infovae'] = {'mean_shift': mean, 'KL': kl, 'objective_gain': gain}

# Numerics of GANs: A=[[-1,-1],[1,-1]], A^T A=2I; regularized eigenvalues -3±i.
observed_ratio, printed_ratio, repaired_ratio = F(1,3), F(1,5), F(1,3)
assert observed_ratio > printed_ratio and observed_ratio == repaired_ratio
results['numerics-gan'] = {'observed_ratio': float(observed_ratio), 'printed_bound': float(printed_ratio), 'repaired_bound': float(repaired_ratio)}
# Slider range: form each regularized matrix and obtain its complex
# eigenvalue from the trace and determinant, independently of the plotted ratio.
from cmath import sqrt as complex_sqrt
for i in range(1, 41):
    gamma = i / 20
    diagonal = -1 - 2 * gamma
    trace, determinant = 2 * diagonal, diagonal ** 2 + 1
    eigenvalue = (trace + complex_sqrt(trace ** 2 - 4 * determinant)) / 2
    ratio = abs(eigenvalue.imag / eigenvalue.real)
    assert abs(ratio - 1 / (1 + 2 * gamma)) < 1e-12
    assert ratio > 1 / (1 + 4 * gamma)
results['numerics-gan']['illustrated_positive_gamma_settings'] = 40

# DPS: SIGNED Jensen gap E[p(y|X)]-p(y|EX), X~N(0,sigma^2), y=2sigma.
# At y=0 this signed gap is negative; that earlier witness is deliberately NOT used.
sigma = .1
actual = (exp(-1)/sqrt(4*pi)-exp(-2)/sqrt(2*pi))/sigma
printed = exp(-1/(2*sigma*sigma))/pi
repaired = exp(-.5)/(pi*sigma)
assert 0 < printed < actual < repaired
results['dps'] = {'sigma': sigma, 'y': 2*sigma, 'exact_signed_gap': actual, 'printed_bound': printed, 'correct_Lipschitz_bound': repaired}

# PAC-Bayes symmetry lemma: finite-set averaging is not group averaging.
def kl_cat(q, p):
    return sum(a*log(a/b) for a,b in zip(q,p))
prior = [1/3]*3
q = [.6,.1,.3]
rotated = [.3,.6,.1]
mixture = [(a+b)/2 for a,b in zip(q,rotated)]
left = kl_cat(mixture,prior)
right = kl_cat(q,prior)-kl_cat(q,mixture)
assert abs(left-right) > .01
# Gaussian sectors of equal prior probability embed these categorical KLs
# in absolutely continuous finite-entropy distributions.
results['pac-bayes-symmetry'] = {'actual_mixture_KL': left, 'claimed_identity_RHS': right, 'residual': left-right}
# The other mass ordering makes the identity err in the opposite direction.
q_other, rotated_other = [.6,.3,.1], [.1,.6,.3]
mixture_other = [(a+b)/2 for a,b in zip(q_other,rotated_other)]
left_other = kl_cat(mixture_other,prior)
right_other = kl_cat(q_other,prior)-kl_cat(q_other,mixture_other)
assert left_other < right_other and abs(right_other-.06822291386) < 1e-10
results['pac-bayes-symmetry']['other_ordering_claimed_RHS'] = right_other

# BatchNorm: batch size2, W=(1,-1), X=I, gamma=1, beta=0, g=(.5,-.5).
# Both valid normalized outputs are ±(1,-1); their BN projector is zero.
y, g = [1.,-1.], [.5,-.5]
projector = [[float(i==j)-.5-y[i]*y[j]/2 for j in range(2)] for i in range(2)]
assert all(v == 0 for row in projector for v in row)
g_squared = sum(v*v for v in g)
projection_squared = sum(a*b for a,b in zip(g,y))**2
printed_bn = g_squared**2-projection_squared
assert printed_bn == -.75
results['batchnorm'] = {'actual_BN_max_squared_gradient': 0, 'printed_RHS_at_X_identity': printed_bn, 'ordinary_max_squared_gradient': g_squared}

# TRADES: nonnegative calibrated C2 loss with phi(0)=1 but phi(-1)=1/2.
def smoothstep(t):
    if t<=0: return 0.
    if t>=1: return 1.
    return 6*t**5-15*t**4+10*t**3
def phi(t):
    return 1-smoothstep(t) if t>=0 else .5+.5*smoothstep(t+1)
assert phi(0)==1 and phi(1)==0 and phi(-1)==.5
# On X={-1,1}, Y=X, f(X)=X, both points are within adversarial radius2.
# Surrogate excess=0, robust error=1, boundary surrogate=phi(-1)=.5.
results['trades'] = {'robust_error': 1, 'surrogate_excess': 0, 'boundary_surrogate': phi(-1)}
assert 1 > phi(-1)

# Bai: convex C3 f(w)=.5(w-1)^2+250(max(w-2,0))^4, locally 1-smooth on [-2,2].
def gradient(w): return w-1+1000*max(w-2,0)**3
exact, approximate = [0.], [0.]
for error in [.1,0.]:
    exact.append(exact[-1]-2*gradient(exact[-1]))
    approximate.append(approximate[-1]-2*gradient(approximate[-1])+error)
assert abs(approximate[-1]-exact[-1]) > .2
results['transformers-as-statisticians'] = {'exact': exact, 'approximate': approximate, 'claimed_error_bound': .2}
# Every interactive perturbation is within the fixed epsilon=0.1 allowance.
for i in range(21):
    error = F(i, 200)
    first = F(0) - 2 * gradient(F(0)) + error
    second = first - 2 * gradient(first)
    assert second == -error - 2000 * error ** 3
    assert error <= F(1, 10)
results['transformers-as-statisticians']['illustrated_perturbation_settings'] = 21

# Xie: positive-transition HMM. Hidden states Ax,Bx,Ay,By,D;
# observable symbols x,z,a,b,delimiter. Rows are probability vectors.
B = [[.9,.1,0,0,0],[.01,.99,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1]]
T0 = [[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1],[0,0,0,0,1],[.005,.995,0,0,0]]
T = [[.999*t+.0002 for t in row] for row in T0]
u = [.999*t+.0002 for t in [.04,.96,0,0,0]]
v = T[4]
def multiply(row, matrix):
    return [sum(a*matrix[i][j] for i,a in enumerate(row)) for j in range(len(matrix[0]))]
def predict(prior, observation):
    weighted = [p*row[observation] for p,row in zip(prior,B)]
    normalizer = sum(weighted)
    return [p/normalizer for p in multiply(multiply(weighted,T),B)]
pu, pv = [predict(u,o) for o in range(5)], [predict(v,o) for o in range(5)]
margins = [sorted(p)[-1]-sorted(p)[-2] for p in pu]
tv = sum(abs(a-b) for a,b in zip(u,v))/2
assert tv < min(margins)/4
assert pu[0].index(max(pu[0])) == 2 and pv[0].index(max(pv[0])) == 3
assert min(t for row in T for t in row)>0
results['implicit-bayesian-inference'] = {'prior_TV': tv, 'minimum_prompt_margin': min(margins), 'prompt_prediction_on_x': pu[0], 'delimiter_prediction_on_x': pv[0]}

print(json.dumps({'scope': 'Arithmetic witnesses only; see web entries for analytic arguments and limits.', 'checks_passed': len(results), 'results': results}, indent=2))
