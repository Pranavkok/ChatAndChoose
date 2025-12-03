import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { removeFromVector } from "../../../../vector-db/pushOutVector";

export async function DELETE(request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        // Delete from Prisma database
        const removedProduct = await prisma.product.delete({
            where: {
                id: parseInt(id)
            }
        });
        console.log("Product deleted from Relational Database");

        // Delete from Pinecone vector database
        try {
            await removeFromVector(id);
            console.log("Product deleted from Vector Database");
        } catch (vectorError) {
            console.error("Error deleting from vector database:", vectorError);
            // Continue even if vector deletion fails - product is already deleted from Prisma
        }

        return NextResponse.json({
            success: true,
            message: "Product deleted successfully",
            product: removedProduct
        });

    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }
        console.error("Error removing product:", error);
        return NextResponse.json(
            { error: "Server error removing product" },
            { status: 500 }
        );
    }
}