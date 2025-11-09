  const loadImages = async () => {
    const allImages = [];

    // Firebase images
    for (let i = 0; i < (selectedCigar?.additionalImages || []).length; i++) {
      const uri = selectedCigar?.additionalImages[i];

      const dim = await new Promise((resolve) => {
        Image.getSize(
          uri,
          (w, h) => resolve({ width: w, height: h }),
          () => resolve({ width: 800, height: 1200 })
        );
      });

      allImages.push({
        id: `fb-${i}`,
        uri,
        dimensions: dim,
      });
    }

    // Local images
    for (let i = 0; i < (additionalImages || []).length; i++) {
      const img = additionalImages[i];

      allImages?.push({
        id: `local-${i}`,
        uri: img.uri,
        dimensions: {
          width: img.width ?? 800,
          height: img.height ?? 1200,
        },
      });
    }
    console.log(allImages, 'haj908')
    return allImages;
  };


   <MasonryList
                          images={loadImages()}
                          columns={2}
                          spacing={6}
                          sorted={true}
                          imageContainerStyle={{ borderRadius: 12, overflow: "hidden" }}
                          onPressImage={(item) => console.log("Image clicked:", item)}
                        />