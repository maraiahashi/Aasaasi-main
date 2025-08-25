from dataclasses import dataclass, field

@dataclass
class LoaderState:
    wotd: list = field(default_factory=list)
    idioms: list = field(default_factory=list)
    grammar_categories: list = field(default_factory=list)
    grammar_topics: dict = field(default_factory=dict)
    tests: dict = field(default_factory=dict)
    dictionary: list = field(default_factory=list)

loader_state = LoaderState()

def bootstrap_loader_state():
    # No-op; your endpoints that hit Mongo don't need this.
    return loader_state
