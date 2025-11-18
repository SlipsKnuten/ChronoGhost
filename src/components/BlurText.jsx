import React, { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

const BlurText = ({
  text,
  delay = 0,
  animateBy = "words",
  direction = "top",
  onAnimationComplete,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const defaultStagger = animateBy === "words" ? 0.06 : 0.06;
  const [scope, setScope] = useState(null);

  const handleAnimationComplete = () => {
    if (onAnimationComplete) onAnimationComplete();
  };

  useEffect(() => {
    if (inView) {
      setIsVisible(true);
    }
  }, [inView]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !isVisible) return;

    setScope(element);
  }, [isVisible]);

  useEffect(() => {
    if (!scope) return;

    const yOffset = direction === "top" ? -40 : 40;
    const itemsSelector =
      animateBy === "words" ? ".word" : ".word > .letter";

    animate(
      Array.from(scope.querySelectorAll(itemsSelector)),
      {
        transform: [
          `translateY(${yOffset}px)`,
          "translateY(0px)",
        ],
        opacity: [0, 1],
        filter: ["blur(4px)", "blur(0px)"],
      },
      {
        duration: 1.4,
        delay: delay + defaultStagger,
        easing: "ease-out",
        onComplete: handleAnimationComplete,
      }
    );
  }, [scope, delay, defaultStagger, direction, animateBy]);

  const renderLetters = (word, wordIndex) => {
    return word.split("").map((letter, letterIndex) => (
      <span
        key={`${wordIndex}-${letterIndex}`}
        className="letter inline-block"
        style={{
          opacity: isVisible ? undefined : 0,
          transform: isVisible ? undefined : `translateY(${direction === "top" ? -40 : 40}px)`,
          filter: isVisible ? undefined : "blur(4px)",
        }}
      >
        {letter}
      </span>
    ));
  };

  const renderWords = () => {
    const words = text.split(" ");
    return words.map((word, wordIndex) => (
      <span key={wordIndex} className="word inline-block whitespace-pre">
        {animateBy === "letters" ? (
          renderLetters(word, wordIndex)
        ) : (
          <span
            className="inline-block"
            style={{
              opacity: isVisible ? undefined : 0,
              transform: isVisible ? undefined : `translateY(${direction === "top" ? -40 : 40}px)`,
              filter: isVisible ? undefined : "blur(4px)",
            }}
          >
            {word}
          </span>
        )}
        {wordIndex < words.length - 1 && "\u00A0"}
      </span>
    ));
  };

  return (
    <span ref={ref} className={className}>
      {renderWords()}
    </span>
  );
};

export default BlurText;
