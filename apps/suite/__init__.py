"""Customer suite core: provider-neutral, standard library only, everything behind switches that default to off.

Nothing in this package talks to a payment provider, mail provider, vault or model. Those are ports
(`typing.Protocol`) with in-process stand-ins for tests. Plans, trial scope and grace periods come from
`config/suite-plans.json`; this code contains no price, plan name, limit or provider.
"""
