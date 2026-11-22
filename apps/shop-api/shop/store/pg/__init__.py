"""PostgreSQL-Umsetzung der Zugriffsschicht (Zielbild D-013). Wird nur geladen, wenn sie gewählt ist.

``base`` (Dokumentform) braucht den Treiber nicht; die Speicherklassen werden erst in ``bind`` geladen.
"""
from types import SimpleNamespace

from .base import PgDatabase


def bind(database):
    """Je Fachbereich ein Speicher über derselben Datenbank."""
    from .accounts import PgAccountStore
    from .carts import PgCartStore
    from .catalog import PgCatalogStore
    from .orders import PgOrderStore
    from .outbox import PgOutboxStore
    from .payments import PgPaymentStore
    from .requests import PgRequestStore
    from .settings import PgSettingsStore
    from .workshops import PgWorkshopStore
    return SimpleNamespace(catalog=PgCatalogStore(database), carts=PgCartStore(database), accounts=PgAccountStore(database),
                           workshops=PgWorkshopStore(database), requests=PgRequestStore(database), outbox=PgOutboxStore(database),
                           orders=PgOrderStore(database), payments=PgPaymentStore(database), settings=PgSettingsStore(database))


__all__ = ["PgDatabase", "bind"]
