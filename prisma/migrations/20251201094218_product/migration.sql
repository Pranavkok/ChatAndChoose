-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "specification" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "image" TEXT,
    "brand" TEXT,
    "gender" TEXT,
    "size" TEXT,
    "color" TEXT,
    "material" TEXT,
    "style" TEXT,
    "pattern" TEXT,
    "fit" TEXT,
    "length" TEXT,
    "sleeve" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_category_key" ON "Product"("category");
