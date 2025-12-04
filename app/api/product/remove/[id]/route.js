import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { removeFromVector } from "../../../../vector-db/pushOutVector";
import { pushInVector } from "../../../../vector-db/pushInVector";

export async function DELETE(request, { params }) {
    const { id } = params;

    // --- Input Validation ---
    if (!id) {
        return NextResponse.json({ error: "Product ID is required in the URL." }, { status: 400 });
    }
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
        return NextResponse.json({ error: "Invalid Product ID format." }, { status: 400 });
    }

    let productToDelete;
    try {
        // --- 1. Fetch Product to ensure it exists and for rollback ---
        productToDelete = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!productToDelete) {
            return NextResponse.json({ error: "Product not found." }, { status: 404 });
        }

        // --- 2. Delete from Vector Database First ---
        await removeFromVector(id);

        // --- 3. Delete from Primary Database ---
        await prisma.product.delete({
            where: { id: productId },
        });

        // --- Success Response ---
        return NextResponse.json({
            success: true,
            message: `Product with ID ${id} deleted successfully.`,
        });

    } catch (error) {
        // --- Error Handling & Rollback ---
        console.error(`Failed to delete product ${id}:`, error);

        // Check for Prisma's "not found" error during the final delete.
        // This is a safeguard, though findUnique should prevent this.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return NextResponse.json({ error: "Product not found." }, { status: 404 });
        }

        // !! ROLLBACK !!
        // If the error occurred *after* the vector was removed, but the DB delete failed,
        // we should try to put the product back into the vector DB to maintain consistency.
        if (productToDelete) {
            try {
                console.warn(`ROLLBACK: Attempting to re-add product ${id} to vector DB.`);
                await pushInVector(productToDelete);
            } catch (rollbackError) {
                console.error(`CRITICAL: Rollback for product ${id} failed:`, rollbackError);
                // At this point, the state is inconsistent.
                // A more advanced system might add this to a retry queue.
            }
        }

        // Generic server error for any other issues
        return NextResponse.json(
            { error: "Internal Server Error: Could not delete the product." },
            { status: 500 }
        );
    }
}