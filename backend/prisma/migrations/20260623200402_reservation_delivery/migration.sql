-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "orderType" TEXT NOT NULL DEFAULT 'pickup';
ALTER TABLE "Reservation" ADD COLUMN     "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Reservation" ADD COLUMN     "deliveryAddress" TEXT;
ALTER TABLE "Reservation" ADD COLUMN     "deliveryLat" DOUBLE PRECISION;
ALTER TABLE "Reservation" ADD COLUMN     "deliveryLng" DOUBLE PRECISION;
