"""добавил статус только для брони

Revision ID: 44691ebb6e72
Revises: 43d848446d38
Create Date: 2025-11-08 20:46:56.921662
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '44691ebb6e72'
down_revision: Union[str, Sequence[str], None] = '43d848446d38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. Удаляем старое ограничение статуса офиса
    op.drop_constraint(
        constraint_name="check_статус_офиса",
        table_name="офис",
        type_="check"
    )

    # 2. Обновляем статус офиса
    op.execute("""
        UPDATE "офис"
        SET статус = 'только для брони'
        WHERE статус = 'в резерве';
    """)

    # 3. Создаём новое ограничение статуса
    op.create_check_constraint(
        constraint_name="check_статус_офиса",
        table_name="офис",
        condition="статус IN ('свободен', 'арендуется', 'только для брони', 'на обслуживании')"
    )

    # 4. Исправляем длительность брони, чтобы существующие записи не нарушали constraint
    op.execute("""
        UPDATE "бронь"
        SET окончание_брони = начало_брони + 31
        WHERE (окончание_брони - начало_брони) > 31;
    """)

    # 5. Создаём constraint для длительности брони
    op.create_check_constraint(
        constraint_name="check_длительность_брони",
        table_name="бронь",
        condition="(окончание_брони - начало_брони) <= 31"
    )


def downgrade():
    # 1. Удаляем ограничение длительности брони
    op.drop_constraint(
        constraint_name="check_длительность_брони",
        table_name="бронь",
        type_="check"
    )

    # 2. Удаляем текущее ограничение статуса
    op.drop_constraint(
        constraint_name="check_статус_офиса",
        table_name="офис",
        type_="check"
    )

    # 3. Возвращаем старый статус для данных
    op.execute("""
        UPDATE "офис"
        SET статус = 'в резерве'
        WHERE статус = 'только для брони';
    """)

    # 4. Восстанавливаем старое ограничение статуса
    op.create_check_constraint(
        constraint_name="check_статус_офиса",
        table_name="офис",
        condition="статус IN ('свободен', 'арендуется', 'в резерве', 'на обслуживании')"
    )
