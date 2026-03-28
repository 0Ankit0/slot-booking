"""add booking marketplace tables

Revision ID: c1d2e3f4a5b6
Revises: b7c1d2e3f4a5
Create Date: 2026-03-27 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b7c1d2e3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    provider_status = sa.Enum('pending', 'approved', 'suspended', name='providerstatus')
    slot_status = sa.Enum('open', 'held', 'booked', 'blocked', name='slotstatus')
    booking_status = sa.Enum('pending', 'confirmed', 'cancelled', 'completed', 'no_show', name='bookingstatus')
    review_status = sa.Enum('published', 'hidden', name='reviewstatus')
    dispute_status = sa.Enum('open', 'investigating', 'resolved', 'rejected', name='disputestatus')
    refund_status = sa.Enum('none', 'pending', 'refunded', 'partial', 'failed', name='refundstatus')
    payout_status = sa.Enum('pending', 'processing', 'paid', 'failed', name='payoutstatus')
    payment_status = sa.Enum('pending', 'completed', 'failed', 'refunded', name='bookingpaymentstatus')
    invoice_status = sa.Enum('draft', 'issued', 'paid', 'void', name='invoicestatus')

    bind = op.get_bind()
    provider_status.create(bind, checkfirst=True)
    slot_status.create(bind, checkfirst=True)
    booking_status.create(bind, checkfirst=True)
    review_status.create(bind, checkfirst=True)
    dispute_status.create(bind, checkfirst=True)
    refund_status.create(bind, checkfirst=True)
    payout_status.create(bind, checkfirst=True)
    payment_status.create(bind, checkfirst=True)
    invoice_status.create(bind, checkfirst=True)

    op.create_table(
        'provider',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=False),
        sa.Column('status', provider_status, nullable=False),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_provider_name'), 'provider', ['name'], unique=False)
    op.create_index(op.f('ix_provider_status'), 'provider', ['status'], unique=False)
    op.create_index(op.f('ix_provider_tenant_id'), 'provider', ['tenant_id'], unique=False)

    op.create_table(
        'resource',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('description', sa.String(length=2000), nullable=False),
        sa.Column('category', sa.String(length=80), nullable=False),
        sa.Column('timezone', sa.String(length=80), nullable=False),
        sa.Column('base_price_minor', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['provider_id'], ['provider.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resource_name'), 'resource', ['name'], unique=False)
    op.create_index(op.f('ix_resource_category'), 'resource', ['category'], unique=False)
    op.create_index(op.f('ix_resource_tenant_id'), 'resource', ['tenant_id'], unique=False)

    op.create_table(
        'availabilityrule',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_minute', sa.Integer(), nullable=False),
        sa.Column('end_minute', sa.Integer(), nullable=False),
        sa.Column('slot_duration_min', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['resource_id'], ['resource.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'availabilityexception',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('ends_at', sa.DateTime(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(['resource_id'], ['resource.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'slot',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('ends_at', sa.DateTime(), nullable=False),
        sa.Column('status', slot_status, nullable=False),
        sa.Column('hold_expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['resource_id'], ['resource.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('resource_id', 'starts_at', 'ends_at', name='uq_slot_resource_time')
    )
    op.create_index(op.f('ix_slot_starts_at'), 'slot', ['starts_at'], unique=False)
    op.create_index(op.f('ix_slot_status'), 'slot', ['status'], unique=False)

    op.create_table(
        'booking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('provider_id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', booking_status, nullable=False),
        sa.Column('payment_status', payment_status, nullable=False),
        sa.Column('refund_status', refund_status, nullable=False),
        sa.Column('amount_minor', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('idempotency_key', sa.String(length=128), nullable=False),
        sa.Column('external_payment_id', sa.String(length=128), nullable=True),
        sa.Column('notes', sa.String(length=2000), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['provider_id'], ['provider.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['resource_id'], ['resource.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key', name='uq_booking_idempotency_key'),
    )
    op.create_index(op.f('ix_booking_user_id'), 'booking', ['user_id'], unique=False)

    op.create_table(
        'bookingslot',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('slot_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['slot_id'], ['slot.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_id', 'slot_id', name='uq_booking_slot'),
    )

    op.create_table(
        'review',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.String(length=3000), nullable=False),
        sa.Column('status', review_status, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resource_id'], ['resource.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_id', 'user_id', name='uq_review_booking_user'),
    )

    op.create_table(
        'waitlistentry',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('desired_start_at', sa.DateTime(), nullable=False),
        sa.Column('desired_end_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resource_id'], ['resource.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'dispute',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('opened_by_user_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=1500), nullable=False),
        sa.Column('status', dispute_status, nullable=False),
        sa.Column('resolution_note', sa.String(length=2000), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['opened_by_user_id'], ['user.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'refundrecord',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('amount_minor', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('status', refund_status, nullable=False),
        sa.Column('reason', sa.String(length=500), nullable=False),
        sa.Column('external_refund_id', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'invoice',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('invoice_no', sa.String(length=60), nullable=False),
        sa.Column('status', invoice_status, nullable=False),
        sa.Column('subtotal_minor', sa.Integer(), nullable=False),
        sa.Column('discount_minor', sa.Integer(), nullable=False),
        sa.Column('tax_minor', sa.Integer(), nullable=False),
        sa.Column('total_minor', sa.Integer(), nullable=False),
        sa.Column('issued_at', sa.DateTime(), nullable=True),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invoice_no', name='uq_invoice_no')
    )

    op.create_table(
        'receipt',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('receipt_no', sa.String(length=60), nullable=False),
        sa.Column('issued_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_id', name='uq_receipt_booking')
    )

    op.create_table(
        'payout',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('provider_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('amount_minor', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('status', payout_status, nullable=False),
        sa.Column('external_reference', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['provider_id'], ['provider.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'bookingauditevent',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=120), nullable=False),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('payload_json', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.add_column('payment_transactions', sa.Column('booking_id', sa.Integer(), nullable=True))
    op.add_column('payment_transactions', sa.Column('tenant_id', sa.Integer(), nullable=True))
    op.add_column('payment_transactions', sa.Column('provider_id', sa.Integer(), nullable=True))
    op.add_column('payment_transactions', sa.Column('reconciliation_reference', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_payment_transactions_booking_id'), 'payment_transactions', ['booking_id'], unique=False)
    op.create_index(op.f('ix_payment_transactions_tenant_id'), 'payment_transactions', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_payment_transactions_provider_id'), 'payment_transactions', ['provider_id'], unique=False)
    op.create_foreign_key(None, 'payment_transactions', 'booking', ['booking_id'], ['id'])
    op.create_foreign_key(None, 'payment_transactions', 'tenant', ['tenant_id'], ['id'])
    op.create_foreign_key(None, 'payment_transactions', 'provider', ['provider_id'], ['id'])

    op.add_column('payment_webhooks', sa.Column('idempotency_key', sa.String(length=128), nullable=True))
    op.create_index(op.f('ix_payment_webhooks_idempotency_key'), 'payment_webhooks', ['idempotency_key'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_payment_webhooks_idempotency_key'), table_name='payment_webhooks')
    op.drop_column('payment_webhooks', 'idempotency_key')

    op.drop_constraint(None, 'payment_transactions', type_='foreignkey')
    op.drop_constraint(None, 'payment_transactions', type_='foreignkey')
    op.drop_constraint(None, 'payment_transactions', type_='foreignkey')
    op.drop_index(op.f('ix_payment_transactions_provider_id'), table_name='payment_transactions')
    op.drop_index(op.f('ix_payment_transactions_tenant_id'), table_name='payment_transactions')
    op.drop_index(op.f('ix_payment_transactions_booking_id'), table_name='payment_transactions')
    op.drop_column('payment_transactions', 'reconciliation_reference')
    op.drop_column('payment_transactions', 'provider_id')
    op.drop_column('payment_transactions', 'tenant_id')
    op.drop_column('payment_transactions', 'booking_id')

    for table in [
        'bookingauditevent', 'payout', 'receipt', 'invoice', 'refundrecord', 'dispute',
        'waitlistentry', 'review', 'bookingslot', 'booking', 'slot',
        'availabilityexception', 'availabilityrule', 'resource', 'provider',
    ]:
        op.drop_table(table)

    bind = op.get_bind()
    sa.Enum(name='invoicestatus').drop(bind, checkfirst=True)
    sa.Enum(name='bookingpaymentstatus').drop(bind, checkfirst=True)
    sa.Enum(name='payoutstatus').drop(bind, checkfirst=True)
    sa.Enum(name='refundstatus').drop(bind, checkfirst=True)
    sa.Enum(name='disputestatus').drop(bind, checkfirst=True)
    sa.Enum(name='reviewstatus').drop(bind, checkfirst=True)
    sa.Enum(name='bookingstatus').drop(bind, checkfirst=True)
    sa.Enum(name='slotstatus').drop(bind, checkfirst=True)
    sa.Enum(name='providerstatus').drop(bind, checkfirst=True)
