import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pushInVector } from "../../../../vector-db/pushInVector";

export async function POST(request) {
    const body = await request.json();
    const { title, category, price, ...otherData } = body;

    // --- Input Validation ---
    if (!title || !category || !price) {
        return NextResponse.json(
            { error: "Missing required fields: title, category, and price are required." },
            { status: 400 }
        );
    }
    if (typeof price !== 'number' || price <= 0) {
        return NextResponse.json(
            { error: "Invalid price: Price must be a positive number." },
            { status: 400 }
        );
    }

    let product;
    try {
        // --- Create Product in Primary Database ---
        product = await prisma.product.create({
            data: {
                title,
                category,
                price,
                ...otherData,
            },
        });

        // --- Push to Vector Database (with error handling) ---
        // This is done after the primary DB write to ensure we have a valid product.
        await pushInVector(product);

        // --- Success Response ---
        return NextResponse.json(product, { status: 201 });

    } catch (error) {
        // --- Error Handling ---
        console.error("Failed to add product:", error);

        // Handle unique constraint violation (e.g., duplicate product title)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { error: "A product with this unique identifier already exists." },
                { status: 409 } // 409 Conflict
            );
        }

        // Generic server error for any other issues
        return NextResponse.json(
            { error: "Internal Server Error: Could not add the product." },
            { status: 500 }
        );
    }
}