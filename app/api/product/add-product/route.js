import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pushInVector } from "../../../../vector-db/pushInVector";

export async function POST(request) {
    const { category, title, description, specification, price, image, brand, gender, size, color, material, style, pattern, fit, length, sleeve } = await request.json();
    try {
        const product = await prisma.product.create({
            data: {
                category,
                title,
                description,
                specification,
                price,
                image,
                brand,
                gender,
                size,
                color,
                material,
                style,
                pattern,
                fit,
                length,
                sleeve,
            }
        });
        const res = await pushInVector(product);
        return NextResponse.json(res);
    } 
    catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Category already exists" },
                { status: 409 }
            );
        }
        throw error;
    }
}