"""Twelve scoped mathematical witnesses; Python standard library only.

These calculations check published statements, not benchmark performance.
Run: python3 reproduce-neurips-2026.py
"""
from fractions import Fraction as Q
from math import ceil, exp, isclose, log, sqrt
import json


def memory_ranking():
    # One coherent strictly positive joint law, with A independent of Q given C.
    delta = Q(1, 10000)
    answer = [Q(1, 2) + delta, Q(1, 2) - delta]
    query = [Q(1, 10), Q(9, 10)]
    atoms = [Q(1, 2) * (answer[c] if a else 1-answer[c]) *
             (query[c] if q else 1-query[c])
             for c in range(2) for a in range(2) for q in range(2)]
    assert min(atoms) > 0 and sum(atoms) == 1
    answer_difference = log(float(answer[0]/answer[1]))
    query_difference = log(float(query[0]/query[1]))
    assert 0 < answer_difference < .001 and query_difference < -2
    # Eq6 adds query_difference despite the conditional-independence residual0.
    assert not isclose(answer_difference, answer_difference + query_difference)
    return dict(answer_saliency_difference=answer_difference,
                marginal_answer_difference=answer_difference,
                query_saliency_difference=query_difference,
                total_probability=float(sum(atoms)), positive_atoms=len(atoms))


def reward_ordering():
    gamma = Q(9, 10)
    baseline = 5
    def value(length, shaped):
        reward = gamma**(abs(length-baseline)+1) if shaped else Q(1)
        return gamma**(length-1) * reward
    original_risky = (value(1,False)+value(9,False))/2
    original_safe = value(6,False)
    shaped_risky = (value(1,True)+value(9,True))/2
    shaped_safe = value(6,True)
    assert (1+9)/2 == baseline
    assert original_risky > original_safe and shaped_risky < shaped_safe
    return dict(original_risky=float(original_risky),original_safe=float(original_safe),
                shaped_risky=float(shaped_risky),shaped_safe=float(shaped_safe))


def supervised_alignment():
    p = [.8,.2]
    q = [.9,.1]
    nll_before,nll_after = -log(p[0]),-log(q[0])
    kl_before = 0.
    kl_after = sum(a*log(a/b) for a,b in zip(p,q))
    assert nll_after < nll_before and kl_after > kl_before
    return dict(nll_before=nll_before,nll_after=nll_after,
                kl_before=kl_before,kl_after=kl_after)


def consistency_boundary():
    similarities = [Q(1)]*4
    mean = sum(similarities)/len(similarities)
    variance = sum((v-mean)**2 for v in similarities)/(len(similarities)-1)
    assert mean == 1 and variance == 0
    try:
        (mean-1)/variance
    except ZeroDivisionError:
        pass
    else:
        raise AssertionError('Perfect-consistency statistic must be undefined.')
    return dict(mean=float(mean),sample_variance=float(variance),
                numerator=0,printed_statistic='0/0',
                conservative_zero_extension='size0; point mass, not N(0,1)')


def contracting_dynamics():
    dt,lip,K,W = 1.,1.,.75,0.
    alpha = (1+lip*dt)*abs(1-K)+abs(K)*W
    assert alpha < 1
    cases = [dict(t=t,actual_open_mse=exp(-2*t),
                  claimed_lower_bound=(1+lip*dt)**(2*t)) for t in [1,2,4]]
    assert all(x['actual_open_mse'] < x['claimed_lower_bound'] for x in cases)
    return dict(drift='F(s)=-s',exact_flow='exp(-t)*s',alpha=alpha,cases=cases)


def exit_conditioning():
    # Fixed calibrated probe; uniformly hold out one of40 exchangeable records.
    population = [(Q(1,4),i<5) for i in range(20)] + [(Q(3,4),i<15) for i in range(20)]
    for score in [Q(1,4),Q(3,4)]:
        cell=[correct for s,correct in population if s==score]
        assert Q(sum(cell),len(cell)) == score
    exits=[]
    for held, (score,correct) in enumerate(population):
        positives=sorted(1-s for i,(s,y) in enumerate(population) if i!=held and y)
        rank=ceil((len(positives)+1)*.95)
        threshold=positives[min(rank,len(positives))-1]
        assert threshold == Q(3,4)
        exits.append((1-score<=threshold,correct))
    assert all(exited for exited,_ in exits)
    precision=Q(sum(correct for _,correct in exits),len(exits))
    assert precision == Q(1,2) and precision < Q(95,100)
    # Continuous balanced calibrated population removes any tie dependence.
    a,b,epsilon=.25,.75,.05
    cutoff=sqrt(a*a+epsilon*(b*b-a*a))
    recall=(b*b-cutoff*cutoff)/(b*b-a*a)
    precision_cont=(b+cutoff)/2
    assert isclose(recall,.95) and precision_cont < .95
    return dict(exchangeable_records=40,all_exit=True,precision=float(precision),
                claimed_precision=.95,continuous_cutoff=cutoff,
                continuous_recall=recall,continuous_precision=precision_cont)


def one_step_decoding():
    p,b=(.6,.3,.1),(0,.4,1)
    weights=[p_j*exp(b_j) for p_j,b_j in zip(p,b)]
    reward=sum(w*b_j for w,b_j in zip(weights,b))/sum(weights)
    deficit=.7-reward
    bound=log(10001*log(6)/.3)/10000
    assert isclose(reward,.3417125110,abs_tol=1e-9) and deficit>bound>0
    assert sum(q_j*b_j for q_j,b_j in zip((.05,.05,.9),b))>.7
    return dict(expected_deficit=deficit,eta=10000,equation58_bound=bound)


def fractional_rotation():
    r=[[0,-1,0],[1,-1,0],[0,0,1]]
    g=[[Q(1),Q(-1,2),0],[Q(-1,2),Q(1),0],[0,0,1]]
    def mv(a,v): return [sum(x*y for x,y in zip(row,v)) for row in a]
    def mm(a,b): return [[sum(a[i][k]*b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    assert mm(mm(list(map(list,zip(*r))),g),r)==g
    assert mm(mm(r,r),r)==[[1,0,0],[0,1,0],[0,0,1]]
    y=[Q(3,10),Q(7,10),0]
    original=[Q(3,10),Q(-3,10),0]
    transformed=[Q(3,10),Q(-4,10),0]
    assert mv(r,original)!=transformed
    assert [x%1 for x in mv(r,y)]==[Q(3,10),Q(6,10),0]
    return dict(rotated_log=list(map(float,mv(r,original))),log_of_transformed=list(map(float,transformed)),lattice_metric_preserved=True)


def latent_selection():
    reward=lambda h:.02+.18*exp(-6*(h+.7)**2)
    saved=12*reward(-.7)*(-.7)/(.7**2)
    assert reward(-.7)>reward(0)>reward(saved)>0
    assert 3*reward(-.7)<log(2)
    return dict(old_reward=reward(0),candidate_reward=reward(-.7),saved_state=saved,saved_reward=reward(saved),latent_positions=4,smallest_binary_entropy=log(2)-3*reward(-.7))


def flat_metric_ratio():
    covariance=sum(v*v for v in [.1,-.1,.2,-.2,.3])/5
    ratio=sqrt(1/(covariance+.0001))
    assert isclose(covariance,.038) and ratio>5
    return dict(flat_line=True,covariance=covariance,euclidean_distance=.1,metric_distance=.1*ratio,raw_ratio=ratio)


def mean_calibration():
    ideal=(.8,.2)
    rare=(.4,.6)
    epsilon=.04*max(abs(log(q/p)) for q,p in zip(rare,ideal))
    gap=log(ideal[0]/ideal[1])
    assert epsilon<gap/2 and rare[1]>rare[0] and ideal[0]>ideal[1]
    failure_bound=min(1,2*epsilon/gap)
    assert failure_bound>=.04
    return dict(mean_log_error=epsilon,half_minimum_gap=gap/2,ranking_failure_probability=.04,markov_repair_bound=failure_bound)


def discriminative_factorization():
    """SUS26-154419-01: exact four-model witness to arXiv:2605.07878v1.

    Standard library only. This function may be appended to the shared
    reproduction script and added to its result dictionary. It does not run
    an author implementation or assess an experimental result.

    For embedded Bernoulli laws use d_P^2(P_p, P_t)=abs(p-t), the normalized
    energy metric. This is a genuine metric of negative type. Its extension
    to P_1(R) is energy distance divided by sqrt(2). On point masses the
    squared MDS distance is abs(z-z'), so an exact coordinate is z-mean(z).
    """
    from fractions import Fraction
    from itertools import product

    F = Fraction
    models = tuple(product((0, 1), repeat=2))  # f_yz(q)=(y,z), label y.
    mass = {model: F(1, 4) for model in models}
    assert sum(mass.values()) == 1
    assert all(sum(mass[x] for x in models if x[0] == y) == F(1, 2)
               for y in (0, 1))

    def phi(a, b):
        return abs(a[1] - b[1])

    # Q={q}, Pi_Q(q)=1. alpha_1(q)=1 is in [0,1]. A positive
    # pair excludes rank zero, so this one-direction factorization is minimal.
    alpha, rank, rho = 1, 1, 0
    matrix = [[phi(a, b) for b in models] for a in models]
    assert max(map(max, matrix)) == 1
    assert all(alpha * phi(a, b) == abs(a[1]-b[1])
               for a in models for b in models)

    # EVERY supported model satisfies the literal existential F* condition.
    fstar_witness = {a: tuple(b for b in models
                            if a[0] != b[0] and phi(a, b) > 0)
                    for a in models}
    assert all(fstar_witness.values())
    assert fstar_witness == {
        (0, 0): ((1, 1),), (0, 1): ((1, 0),),
        (1, 0): ((0, 1),), (1, 1): ((0, 0),),
    }
    fstar_mass = sum(mass[a] for a in models if fstar_witness[a])
    assert fstar_mass == 1

    # Full models identify y. Embedded class-conditional distributions coincide.
    full_classifier_risks = [sum(mass[a] * (h[i] != a[0])
                                 for i, a in enumerate(models))
                             for h in product((0, 1), repeat=4)]
    full_risk = min(full_classifier_risks)
    class_conditionals = {
        y: {z: sum(mass[a] for a in models if a == (y, z)) / F(1, 2)
            for z in (0, 1)} for y in (0, 1)
    }
    assert full_risk == 0
    assert class_conditionals[0] == class_conditionals[1] == {0: F(1, 2), 1: F(1, 2)}
    risks = [sum(mass[a] * (h[a[1]] != a[0]) for a in models)
             for h in product((0, 1), repeat=2)]
    assert risks == [F(1, 2)] * 4

    # Exact MDS. Centered coordinates z-1/2 reproduce every squared distance.
    coordinates = [F(a[1])-F(1, 2) for a in models]
    assert all((coordinates[i]-coordinates[j])**2 == matrix[i][j]
               for i in range(4) for j in range(4))
    centered_gram = [[x*y for y in coordinates] for x in coordinates]
    # Nonzero outer product has rank exactly one. d=1 meets the printed bound.
    assert centered_gram[0][0] > 0
    assert all(centered_gram[i][j] * centered_gram[0][0] ==
               centered_gram[i][0] * centered_gram[0][j]
               for i in range(4) for j in range(4))
    assert all(min(rank**2, n, m*(4-1)) == 1
               for n in range(1, 9) for m in range(1, 9))

    # Global-model-space check: any response distribution on X pushes forward
    # to Bern(p); set phi(f,f')=abs(p-p'). This works on ALL stochastic models,
    # not just the four supported models. The negative-type identity is
    # sum_ij w_i*w_j*abs(p_i-p_j) = -2 integral (sum_i w_i*1[p_i>t])^2 dt
    # whenever sum_i w_i=0. Below it is checked exactly on a nonbinary grid.
    probabilities = [F(0), F(1, 5), F(3, 5), F(1)]
    negative_type_checks = 0
    for first_weights in product(range(-2, 3), repeat=3):
        weights = (*first_weights, -sum(first_weights))
        quadratic = sum(weights[i]*weights[j]*abs(probabilities[i]-probabilities[j])
                        for i in range(4) for j in range(4))
        integral = sum((probabilities[k+1]-probabilities[k]) *
                       sum(weights[i] for i in range(k+1, 4))**2
                       for k in range(3))
        assert quadratic == -2*integral <= 0
        negative_type_checks += 1

    # For arbitrary n the iid training sample is independent of the test y.
    # Condition on its FULL identities and labels (more than MDS receives).
    # At either test z the two labels retain equal probability. Enumerate all
    # 340 possible training samples for n=1,...,4 as an additional exact check.
    training_cases = 0
    for n in range(1, 5):
        for training in product(models, repeat=n):
            training_mass = F(1, 4)**n
            for z in (0, 1):
                joint_y0 = training_mass * mass[(0, z)]
                joint_y1 = training_mass * mass[(1, z)]
                assert joint_y0 == joint_y1
                assert joint_y0/(joint_y0+joint_y1) == F(1, 2)
            # Any distance-only embedding depends on training and test z,
            # never test y; the argument applies to all n, not just this loop.
            training_cases += 1
    assert training_cases == 340

    # Changed nuisance law: independent Z~Bern(.3) leaves every risk at .5.
    alternate_mass = {(y, z): F(1, 2) * (F(3, 10) if z else F(7, 10))
                      for y, z in models}
    alternate_risks = [sum(alternate_mass[a] * (h[a[1]] != a[0]) for a in models)
                       for h in product((0, 1), repeat=2)]
    assert alternate_risks == [F(1, 2)] * 4

    # The event inf_h L >= .5 has probability one for EVERY n,m>=1.
    # The claimed RHS is rho**m+gamma(n)=gamma(n)->0: contradiction.
    assert rho**1 == 0 and min(risks) == F(1, 2)
    return {
        'finding_id': 'SUS26-154419-01',
        'metric': 'd_P^2(Bern(p),Bern(p_prime))=abs(p-p_prime)',
        'model_probabilities': {str(a): str(mass[a]) for a in models},
        'phi_matrix': matrix,
        'minimal_rank': rank,
        'alpha': alpha,
        'rho': rho,
        'Fstar_witnesses': {str(a): list(bs) for a, bs in fstar_witness.items()},
        'Fstar_probability': str(fstar_mass),
        'full_Bayes_risk': str(full_risk),
        'full_model_classifiers_checked': len(full_classifier_risks),
        'embedded_class_conditionals': {
            str(y): {str(z): str(p) for z, p in law.items()}
            for y, law in class_conditionals.items()},
        'all_embedded_classifier_risks': [str(x) for x in risks],
        'MDS_coordinates': [str(x) for x in coordinates],
        'MDS_Gram_rank': 1,
        'MDS_dimension': 1,
        'negative_type_exact_checks': negative_type_checks,
        'conditional_training_samples_checked': training_cases,
        'changed_nuisance_classifier_risks': [str(x) for x in alternate_risks],
        'theorem_failure_event_probability_for_all_n_m': 1,
        'claimed_RHS': 'gamma(n)->0',
    }


if __name__ == '__main__':
    results={'SUS26-155002-01':memory_ranking(),
             'SUS26-149595-01':reward_ordering(),
             'SUS26-154345-01':supervised_alignment(),
             'SUS26-155880-01':consistency_boundary(),
             'SUS26-153606-01':contracting_dynamics(),
             'SUS26-149284-01':exit_conditioning(),
             'SUS26-152632-01':one_step_decoding(),
             'SUS26-152663-02':fractional_rotation(),
             'SUS26-152643-02':latent_selection(),
             'SUS26-152700-01':flat_metric_ratio(),
             'SUS26-155216-03':mean_calibration(),
             'SUS26-154419-01':discriminative_factorization()}
    assert len(results)==12
    print(json.dumps(dict(checks_passed=12,results=results),indent=2))
