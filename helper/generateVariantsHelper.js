
export const generateVariants = (options) => {
    const combinations = [];
  
    const combine = (optionIndex, currentVariant) => {
      if (optionIndex === options.length) {
        combinations.push(currentVariant);
        return;
      }
  
      const option = options[optionIndex];
      option.values.forEach((value) => {
        combine(optionIndex + 1, [
          ...currentVariant,
          { name: value, optionName: option.name },
        ]);
      });
    };
  
    combine(0, []);
    return combinations;
  };
  