import { Component } from 'solid-js';
declare type Particle = {
    color: string;
    degree: number;
};
declare type ParticleShape = 'mix' | 'circles' | 'rectangles';
interface IConfettiExplosion {
    count?: number;
    colors?: string[];
    particleCount?: number;
    particleSize?: number;
    particlesShape?: ParticleShape;
    duration?: number;
    force?: number;
    stageHeight?: number;
    stageWidth?: number;
    shouldDestroyAfterDone?: boolean;
}
declare module 'solid-js' {
    namespace JSX {
        interface Directives {
            confettiStyles: Particle & IConfettiExplosion;
        }
    }
}
declare const ConfettiExplosion: Component<IConfettiExplosion>;
export default ConfettiExplosion;
