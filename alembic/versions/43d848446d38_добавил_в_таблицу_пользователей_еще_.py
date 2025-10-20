"""добавил в таблицу пользователей еще одну роль staff

Revision ID: 43d848446d38
Revises: ea8284d3e1da
Create Date: 2025-10-20 18:00:15.053485

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '43d848446d38'
down_revision: Union[str, Sequence[str], None] = 'ea8284d3e1da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '43d848446d38'
down_revision = 'ea8284d3e1da'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # удаляем старое ограничение
    op.drop_constraint('пользователь_role_check', 'пользователь', type_='check')
    # создаём новое с добавленной ролью 'staff'
    op.create_check_constraint(
        'пользователь_role_check',  # имя ограничения
        'пользователь',
        "role IN ('admin','tenant','staff')"
    )


def downgrade() -> None:
    # откат: возвращаем старое ограничение без 'staff'
    op.drop_constraint('пользователь_role_check', 'пользователь', type_='check')
    op.create_check_constraint(
        'пользователь_role_check',
        'пользователь',
        "role IN ('admin','tenant')"
    )
