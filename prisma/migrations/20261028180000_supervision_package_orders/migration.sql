-- CreateEnum
CREATE TYPE "SupervisionPackageStatus" AS ENUM ('draft', 'received', 'awaiting_payment', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "supervision_package_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "member_id" TEXT,
    "payment_id" TEXT,
    "status" "SupervisionPackageStatus" NOT NULL DEFAULT 'draft',
    "claims_member" BOOLEAN NOT NULL DEFAULT false,
    "is_member_price" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(10,2) NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "submitted_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_package_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supervision_package_orders_payment_id_key" ON "supervision_package_orders"("payment_id");

-- CreateIndex
CREATE INDEX "supervision_package_orders_user_id_idx" ON "supervision_package_orders"("user_id");

-- CreateIndex
CREATE INDEX "supervision_package_orders_status_idx" ON "supervision_package_orders"("status");

-- AddForeignKey
ALTER TABLE "supervision_package_orders" ADD CONSTRAINT "supervision_package_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_package_orders" ADD CONSTRAINT "supervision_package_orders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
