import { Before } from "./Before.ts";
import { IEntity } from "../common/interfaces/IEntity.ts";
import { IGraph } from "../graph/IGraph.ts";
import { IPosition } from "./IPosition.ts";
import { After } from "./After.ts";
import { KahnGraph } from "../sort/topological/KahnGraph.ts";

interface ILazyPositionProvider<T extends IEntity> {
    (): IPosition<T>;
}

export class PositionSupport<T extends IEntity> {

    private currentElementId: string | undefined = undefined;
    private readonly elements: Map<string, T> = new Map();
    private readonly positionProviders: Map<string, ILazyPositionProvider<T>[]> = new Map();

    constructor(private readonly graphFactory: () => IGraph<T> = () => new KahnGraph()) {
    }

    elem(elem: T): this {
        this.currentElementId = elem.id;
        this.initElement(elem);
        return this;
    }


    before(elementId: string): this {
        return this.positioning(() => new Before(this.elementById(elementId)));
    }

    after(elementId: string): this {
        return this.positioning(() => new After(this.elementById(elementId)));
    }

    sort(): T[] {
        const graph = this.graphFactory();
        for (const node of this.elements.values()) {
            graph.addNode(node);
        }
        for (const [elementId, providers] of this.positionProviders.entries()) {
            const element: T = this.elementById(elementId);
            for (const provider of providers) {
                for (const [from, to] of provider().sort(element)) {
                    graph.addEdge(from, to);
                }
            }
        }
        return graph.sort();
    }
    private positioning(provider: ILazyPositionProvider<T>): this {
        this.ensureCurrentElementId();
        this.initElementPositionProvider(this.currentElementId as string).push(provider);
        return this;

    }
    private ensureCurrentElementId() {
        if (this.currentElementId === undefined) {
            throw new ReferenceError(`No current element is defined`);
        }
    }

    private initElement(elem: T) {
        if (!this.elements.has(elem.id)) {
            this.elements.set(elem.id, elem);
        }
    }

    private initElementPositionProvider(elementId: string): ILazyPositionProvider<T>[] {
        if (!this.positionProviders.has(elementId)) {
            const providers = [] as ILazyPositionProvider<T>[];
            this.positionProviders.set(elementId, providers);
        }
        return this.positionProviders.get(elementId) as ILazyPositionProvider<T>[];
    }

    private elementById(elementId: string): T {
        if (!this.elements.has(elementId)) {
            throw new ReferenceError(`Element not found with id: ${elementId}`);
        }
        return this.elements.get(elementId) as T;
    }
}
