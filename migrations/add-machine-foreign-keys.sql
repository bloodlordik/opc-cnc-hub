-- Migration: Add foreign key columns to machine table
-- Date: 2026-03-03

-- Add messageSchemaId column
ALTER TABLE machine 
ADD COLUMN IF NOT EXISTS "messageSchemaId" integer NULL;

-- Add machineTypeId column  
ALTER TABLE machine
ADD COLUMN IF NOT EXISTS "machineTypeId" integer NULL;

-- Add foreign key constraint for messageSchemaId
ALTER TABLE machine
ADD CONSTRAINT "FK_machine_messageSchema" 
FOREIGN KEY ("messageSchemaId") 
REFERENCES message_schema(id) 
ON DELETE SET NULL;

-- Add foreign key constraint for machineTypeId
ALTER TABLE machine
ADD CONSTRAINT "FK_machine_machineType" 
FOREIGN KEY ("machineTypeId") 
REFERENCES machine_type(id) 
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "IDX_machine_messageSchemaId" ON machine ("messageSchemaId");
CREATE INDEX IF NOT EXISTS "IDX_machine_machineTypeId" ON machine ("machineTypeId");
