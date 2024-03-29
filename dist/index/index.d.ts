import { Component } from "solid-js";
import "./styles.css";
type Particle = {
    color: string;
    degree: number;
};
type ParticleShape = "mix" | "circles" | "rectangles";
interface IConfettiExplosion {
    count?: number;
    colors?: string[];
    class?: string;
    particleCount?: number;
    particleSize?: number;
    particlesShape?: ParticleShape;
    duration?: number;
    force?: number;
    stageHeight?: number;
    stageWidth?: number;
    shouldDestroyAfterDone?: boolean;
}
declare module "solid-js" {
    namespace JSX {
        interface Directives {
            confettiStyles: Particle & IConfettiExplosion;
        }
    }
}
export declare const ConfettiExplosion: Component<IConfettiExplosion>;
export {};
