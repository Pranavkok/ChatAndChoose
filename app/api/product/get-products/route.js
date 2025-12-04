import { NextResponse } from "next/server";
import { genarateFilter } from "../../../../llm/genarateFilter";
import { searchProducts } from "../../../../vector-db/pushInVector";
import { productDetails } from "../../../../llm/genarateFinalResponse";
import { promptResponse } from "../../../../llm/genaratePromptResponse";
import { freshPrompt } from "../../../../llm/genaratePromptResponse";

function parseFilterResponse(raw) {
    let text = raw.trim();

    if (text.startsWith("```")) {
        text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }

    return JSON.parse(text);
}

export async function POST(request) {
    try {
        const { prompt , history} = await request.json();
        const newPrompt = await freshPrompt(prompt);

        const raw = await genarateFilter(newPrompt);
        console.log(raw);
        const filters = parseFilterResponse(raw);

        const maxprice = filters.price_max;
        const for_gender = filters.gender;
        const resultArray = [];

        const productArray = await searchProducts(newPrompt);
        
        // for (const p of productArray) {
        //     if (maxprice != null && p.metadata.price <= maxprice && p.score > 0.55) {
        //         resultArray.push(p);
        //     } else if (maxprice == null && p.score > 0.55 ) {
        //         resultArray.push(p);
        //     }

        //     if (resultArray.length >= 5) {
        //         break;
        //     }
        // }

        for (const p of productArray) {
            const genderOk =
                for_gender === "" ||
                p.metadata.gender?.toLowerCase() === for_gender.toLowerCase();
        
            const scoreOk = p.score > 0.55;
  
            const priceOk =
                maxprice == null || p.metadata.price <= maxprice;
        
            if (genderOk && scoreOk && priceOk) {
                resultArray.push(p);
            }
        
            if (resultArray.length >= 5) break;
        }

        const [promptRes, finalResponse] = await Promise.all([
            promptResponse(prompt,history),
            productDetails(resultArray,prompt,history)
        ]);

        return NextResponse.json({
            products: resultArray,
            formattedResponse: finalResponse,
            promptResponse: promptRes
        });
    } catch (error) {
        console.error("get-products error:", error);
        return NextResponse.json(
            { error: "Server error parsing filters" },
            { status: 501 }
        );
    }
}