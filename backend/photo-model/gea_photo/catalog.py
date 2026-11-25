"""Reviewed identities and angle groups for the 72 survey photographs.

Angle groups are diagnostic holdouts within ONE capture session, not independent test data.
P01 is a humerus (museum label), not the shell described in the original quest.
"""

from gea_photo.core import Target

MODEL_ID: str = "facebook/dinov2-small"
MODEL_REVISION: str = "8c0210022ead0e9012784aecff426ff6613bf835"
TARGETS: tuple[Target, ...] = (
    Target(
        poi="P01",
        quest_id="40000000-0000-4000-8000-000000000001",
        name="Tulang lengan Megalochelys",
        aliases=("Megalochelys",),
        view_groups=("front", "front", "top", "right", "top", "top", "top", "left", "left", "top"),
    ),
    Target(
        poi="P02",
        quest_id="40000000-0000-4000-8000-000000000024",
        name="Head coral",
        aliases=("Head Coral",),
        view_groups=(
            "front",
            "front",
            "top",
            "right",
            "right",
            "right",
            "back",
            "back",
            "back",
            "top",
            "left",
        ),
    ),
    Target(
        poi="P03",
        quest_id="40000000-0000-4000-8000-000000000003",
        name="Obsidian",
        aliases=("Obsidian",),
        view_groups=(
            "front",
            "right",
            "right",
            "back",
            "back",
            "front",
            "front",
            "left",
            "top",
            "top",
            "top",
        ),
    ),
    Target(
        poi="P07",
        quest_id="40000000-0000-4000-8000-000000000007",
        name="Dasit",
        aliases=("Dasit", "Dacite"),
        view_groups=(
            "front",
            "right",
            "right",
            "back",
            "top",
            "back",
            "left",
            "left",
            "front",
            "front",
        ),
    ),
    Target(
        poi="P09",
        quest_id="40000000-0000-4000-8000-000000000025",
        name="Meteorit Namibia",
        aliases=("Meteorit Namibia", "Meteorite Namibia"),
        view_groups=(
            "front",
            "top",
            "top",
            "back",
            "right",
            "right",
            "top",
            "left",
            "left",
            "front",
        ),
    ),
    Target(
        poi="P10",
        quest_id="40000000-0000-4000-8000-000000000010",
        name="Rijang",
        aliases=("Rijang", "Chert"),
        view_groups=("front", "front", "front", "top", "right", "right", "left", "left", "back"),
    ),
    Target(
        poi="P11",
        quest_id="40000000-0000-4000-8000-000000000026",
        name="Nikel",
        aliases=("Nikel", "Nickel"),
        view_groups=(
            "front",
            "front",
            "front",
            "top",
            "right",
            "right",
            "front",
            "left",
            "back",
            "back",
            "back",
        ),
    ),
)
