"""Fachliche Fehler der Zugriffsschicht. Sie tragen weder Treibertext noch Verbindungsdaten."""


class StoreError(Exception):
    pass


class RevisionStale(StoreError):
    """Der erwartete Stand ist veraltet oder ein anderer Schreiber war schneller."""


class ArchiveTooLarge(StoreError):
    """Der Beleg passt nicht mehr in die Ablage."""


class StoredDataInvalid(StoreError):
    """Die Daten lassen sich in dieser Form nicht ablegen."""


class StoreUnavailable(StoreError):
    """Der Speicher hat den Vorgang nicht ausgeführt oder nicht bestätigt."""
