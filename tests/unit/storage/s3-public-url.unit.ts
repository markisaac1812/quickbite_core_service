import {S3StorageProvider} from "../../../src/pkg/storage/s3";

const base = {region: "eu-north-1", bucket: "my-bucket", accessKeyId: "x", secretAccessKey: "y"};

describe("S3StorageProvider.getPublicUrl", () => {
    it("uses the CDN base url when configured", () => {
        const s3 = new S3StorageProvider({...base, publicBaseUrl: "https://abc.cloudfront.net"});

        expect(s3.getPublicUrl("restaurants/2/a.png")).toBe("https://abc.cloudfront.net/restaurants/2/a.png");
    });

    it("falls back to the regional S3 url without a CDN", () => {
        const s3 = new S3StorageProvider(base);

        expect(s3.getPublicUrl("restaurants/2/a.png")).toBe("https://my-bucket.s3.eu-north-1.amazonaws.com/restaurants/2/a.png");
    });

    it("url-encodes each key segment but keeps the slashes", () => {
        const s3 = new S3StorageProvider({...base, publicBaseUrl: "https://abc.cloudfront.net"});

        expect(s3.getPublicUrl("restaurants/2/my logo.png")).toBe("https://abc.cloudfront.net/restaurants/2/my%20logo.png");
    });

    it("puts the CDN domain in the url it returns from a presigned upload, while uploads still go to S3", async () => {
        const s3 = new S3StorageProvider({...base, publicBaseUrl: "https://abc.cloudfront.net"});

        const p = await s3.createPresignedUpload({key: "restaurants/2/a.png", contentType: "image/png", contentLength: 10, expiresInSeconds: 60});

        expect(p.publicUrl).toBe("https://abc.cloudfront.net/restaurants/2/a.png");
        expect(p.uploadUrl.startsWith("https://my-bucket.s3.eu-north-1.amazonaws.com/restaurants/2/a.png?")).toBe(true);
    });
});
