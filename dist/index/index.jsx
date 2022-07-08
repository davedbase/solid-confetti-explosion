import { Show, For, onMount, mergeProps, createMemo, createSignal, onCleanup, } from 'solid-js';
import { styled, keyframes } from 'solid-styled-components';
const ROTATION_SPEED_MIN = 200; // minimum possible duration of single particle full rotation
const ROTATION_SPEED_MAX = 800; // maximum possible duration of single particle full rotation
const CRAZY_PARTICLES_FREQUENCY = 0.1; // 0-1 frequency of crazy curvy unpredictable particles
const CRAZY_PARTICLE_CRAZINESS = 0.3; // 0-1 how crazy these crazy particles are
const BEZIER_MEDIAN = 0.5; // utility for mid-point bezier curves, to ensure smooth motion paths
const FORCE = 0.5; // 0-1 roughly the vertical force at which particles initially explode
const SIZE = 12; // max height for particle rectangles, diameter for particle circles
const FLOOR_HEIGHT = 800; // pixels the particles will fall from initial explosion point
const FLOOR_WIDTH = 1600; // horizontal spread of particles in pixels
const PARTICLE_COUNT = 150;
const DURATION = 3500;
const COLORS = ['#FFC700', '#FF0000', '#2E3191', '#41BBC7'];
const createParticles = (count, colors) => {
    const increment = 360 / count;
    return Array.from({ length: count }, (_, i) => ({
        color: colors[i % colors.length],
        degree: i * increment,
    }));
};
function round(num, precision = 2) {
    return Math.round((num + Number.EPSILON) * 10 ** precision) / 10 ** precision;
}
function arraysEqual(a, b) {
    if (a === b)
        return true;
    if (a == null || b == null)
        return false;
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (a[i] !== b[i])
            return false;
    return true;
}
const mapRange = (value, x1, y1, x2, y2) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
const rotate = (degree, amount) => {
    const result = degree + amount;
    return result > 360 ? result - 360 : result;
};
const coinFlip = () => Math.random() > 0.5;
// avoid this for circles, as it will have no visual effect
const zAxisRotation = [0, 0, 1];
const rotationTransforms = [
    // dual axis rotations (a bit more realistic)
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, 1],
    // single axis rotations (a bit dumber)
    [1, 0, 0],
    [0, 1, 0],
    zAxisRotation,
];
const shouldBeCircle = (rotationIndex) => !arraysEqual(rotationTransforms[rotationIndex], zAxisRotation) && coinFlip();
const isUndefined = (value) => typeof value === 'undefined';
const error = (message) => {
    console.error(message);
};
function validate(particleCount, duration, colors, particleSize, force, stageHeight, stageWidth, particlesShape) {
    const isSafeInteger = Number.isSafeInteger;
    if (!isUndefined(particleCount) &&
        isSafeInteger(particleCount) &&
        particleCount < 0) {
        error('particleCount must be a positive integer');
        return false;
    }
    if (!isUndefined(duration) && isSafeInteger(duration) && duration < 0) {
        error('duration must be a positive integer');
        return false;
    }
    if (!isUndefined(particlesShape) &&
        !['mix', 'circles', 'rectangles'].includes(particlesShape)) {
        error('particlesShape should be either "mix" or "circles" or "rectangle"');
        return false;
    }
    if (!isUndefined(colors) && !Array.isArray(colors)) {
        error('colors must be an array of strings');
        return false;
    }
    if (!isUndefined(particleSize) &&
        isSafeInteger(particleSize) &&
        particleSize < 0) {
        error('particleSize must be a positive integer');
        return false;
    }
    if (!isUndefined(force) && isSafeInteger(force) && (force < 0 || force > 1)) {
        error('force must be a positive integer and should be within 0 and 1');
        return false;
    }
    if (!isUndefined(stageHeight) &&
        typeof stageHeight === 'number' &&
        isSafeInteger(stageHeight) &&
        stageHeight < 0) {
        error('floorHeight must be a positive integer');
        return false;
    }
    if (!isUndefined(stageWidth) &&
        typeof stageWidth === 'number' &&
        isSafeInteger(stageWidth) &&
        stageWidth < 0) {
        error('floorWidth must be a positive integer');
        return false;
    }
    return true;
}
const confettiStyles = (node, inOptions) => {
    const opts = inOptions();
    // Get x landing point for it
    const landingPoint = mapRange(Math.abs(rotate(opts.degree, 90) - 180), 0, 180, -opts.stageWidth / 2, opts.stageWidth / 2);
    // Crazy calculations for generating styles
    const rotation = Math.random() * (ROTATION_SPEED_MAX - ROTATION_SPEED_MIN) +
        ROTATION_SPEED_MIN;
    const rotationIndex = Math.round(Math.random() * (rotationTransforms.length - 1));
    const durationChaos = opts.duration - Math.round(Math.random() * 1000);
    const shouldBeCrazy = Math.random() < CRAZY_PARTICLES_FREQUENCY;
    const isCircle = opts.particlesShape !== 'rectangles' &&
        (opts.particlesShape === 'circles' || shouldBeCircle(rotationIndex));
    // x-axis disturbance, roughly the distance the particle will initially deviate from its target
    const x1 = shouldBeCrazy
        ? round(Math.random() * CRAZY_PARTICLE_CRAZINESS, 2)
        : 0;
    const x2 = x1 * -1;
    const x3 = x1;
    // x-axis arc of explosion, so 90deg and 270deg particles have curve of 1, 0deg and 180deg have 0
    const x4 = round(Math.abs(mapRange(Math.abs(rotate(opts.degree, 90) - 180), 0, 180, -1, 1)), 4);
    // roughly how fast particle reaches end of its explosion curve
    const y1 = round(Math.random() * BEZIER_MEDIAN, 4);
    // roughly maps to the distance particle goes before reaching free-fall
    const y2 = round(Math.random() * opts.force * (coinFlip() ? 1 : -1), 4);
    // roughly how soon the particle transitions from explosion to free-fall
    const y3 = BEZIER_MEDIAN;
    // roughly the ease of free-fall
    const y4 = round(Math.max(mapRange(Math.abs(opts.degree - 180), 0, 180, opts.force, -opts.force), 0), 4);
    const setCSSVar = (key, val) => node.style.setProperty(key, val + '');
    setCSSVar('--x-landing-point', `${landingPoint}px`);
    setCSSVar('--duration-chaos', `${durationChaos}ms`);
    setCSSVar('--x1', `${x1}`);
    setCSSVar('--x2', `${x2}`);
    setCSSVar('--x3', `${x3}`);
    setCSSVar('--x4', `${x4}`);
    setCSSVar('--y1', `${y1}`);
    setCSSVar('--y2', `${y2}`);
    setCSSVar('--y3', `${y3}`);
    setCSSVar('--y4', `${y4}`);
    // set --width and --height here
    setCSSVar('--width', `${isCircle
        ? opts.particleSize
        : Math.round(Math.random() * 4) + opts.particleSize / 2}px`);
    setCSSVar('--height', (isCircle
        ? opts.particleSize
        : Math.round(Math.random() * 2) + opts.particleSize) + 'px');
    setCSSVar('--rotation', `${rotationTransforms[rotationIndex].join()}`);
    setCSSVar('--rotation-duration', `${rotation}ms`);
    setCSSVar('--border-radius', `${isCircle ? '50%' : '0'}`);
};
confettiStyles;
const ConfettiExplosion = (inProps) => {
    let props = mergeProps({
        particleCount: PARTICLE_COUNT,
        duration: DURATION,
        colors: COLORS,
        particleSize: SIZE,
        force: FORCE,
        stageHeight: FLOOR_HEIGHT,
        stageWidth: FLOOR_WIDTH,
        shouldDestroyAfterDone: true,
        particlesShape: 'mix',
    }, inProps);
    const [isVisible, setVisible] = createSignal(true);
    const isValid = createMemo(() => validate(props.particleCount, props.duration, props.colors, props.particleSize, props.force, props.stageHeight, props.stageWidth, props.particlesShape));
    const particles = createMemo(() => createParticles(props.particleCount, props.colors));
    onMount(() => {
        const timeoutId = setTimeout(() => {
            if (props.shouldDestroyAfterDone) {
                setVisible(false);
            }
        }, props.duration);
        onCleanup(() => clearTimeout(timeoutId));
    });
    return (<Show when={isVisible() && isValid()}>
      <Confetti class="container" style={{ '--floor-height': `${props.stageHeight}px` }}>
        <For each={particles()}>
          {(particle) => (<div class="particle" use:confettiStyles={{ ...particle, ...props }}>
              <div style={{ '--bgcolor': particle.color }}/>
            </div>)}
        </For>
      </Confetti>
    </Show>);
};
const yAxis = keyframes `
  to {
    transform: translate3d(0, var(--floor-height), 0);
  }
`;
const xAxis = keyframes `
  to {
    transform: translate3d(var(--x-landing-point), 0, 0);
  }
`;
const rotation = keyframes `
  to {
    transform: rotate3d(var(--rotation), 360deg);
  }
`;
const Confetti = styled('div') `
  width: 0;
  height: 0;
  overflow: visible;
  position: relative;
  transform: translate3d(var(--x, 0), var(--y, 0), 0);
  z-index: 1200;
  .particle {
    animation: ${xAxis} var(--duration-chaos) forwards
      cubic-bezier(var(--x1), var(--x2), var(--x3), var(--x4));
    div {
      position: absolute;
      top: 0;
      left: 0;
      animation: ${yAxis} var(--duration-chaos) forwards
        cubic-bezier(var(--y1), var(--y2), var(--y3), var(--y4));
      width: var(--width);
      height: var(--height);
      &:before {
        display: block;
        height: 100%;
        width: 100%;
        content: '';
        background-color: var(--bgcolor);
        animation: ${rotation} var(--rotation-duration) infinite linear;
        border-radius: var(--border-radius);
      }
    }
  }
`;
export default ConfettiExplosion;
