"""Add missing agent fields

Revision ID: add_missing_agent_fields
Revises: add_agent_topology_fields
Create Date: 2025-08-21 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_missing_agent_fields'
down_revision = 'add_agent_topology_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing fields to agents table
    op.add_column('agents', sa.Column('ip_address', sa.String(), nullable=True))
    op.add_column('agents', sa.Column('port', sa.Integer(), nullable=True, server_default='8080'))
    
    # Add missing fields to agent_network_access table
    op.add_column('agent_network_access', sa.Column('access_level', sa.String(), nullable=True, server_default='full'))
    op.add_column('agent_network_access', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Create agent_token_audit_log table
    op.create_table('agent_token_audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('details', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_token_audit_log_id'), 'agent_token_audit_log', ['id'], unique=False)


def downgrade():
    # Drop agent_token_audit_log table
    op.drop_index(op.f('ix_agent_token_audit_log_id'), table_name='agent_token_audit_log')
    op.drop_table('agent_token_audit_log')
    
    # Remove fields from agent_network_access table
    op.drop_column('agent_network_access', 'updated_at')
    op.drop_column('agent_network_access', 'access_level')
    
    # Remove fields from agents table
    op.drop_column('agents', 'port')
    op.drop_column('agents', 'ip_address') 