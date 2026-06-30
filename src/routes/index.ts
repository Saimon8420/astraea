import { Router } from "express";
import { natalRouter } from "./natal";
import { positionsRouter } from "./positions";
import { transitsRouter } from "./transits";
import { synastryRouter } from "./synastry";
import { compositeRouter } from "./composite";
import { solarReturnRouter } from "./solarReturn";
import { horoscopeRouter } from "./horoscope";
import { referenceRouter } from "./reference";
import { metaRouter } from "./meta";

export const v1Router = Router();

v1Router.use(natalRouter);
v1Router.use(positionsRouter);
v1Router.use(transitsRouter);
v1Router.use(synastryRouter);
v1Router.use(compositeRouter);
v1Router.use(solarReturnRouter);
v1Router.use(horoscopeRouter);
v1Router.use(referenceRouter);
v1Router.use(metaRouter);
