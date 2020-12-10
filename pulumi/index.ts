import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as awsx from "@pulumi/awsx";

// Create a repository
const repo = new awsx.ecr.Repository("tezos-k8s");

import * as fs from 'fs';
import * as YAML from 'yaml'

const { readdirSync } = require('fs')

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name)

const helm_values_file = fs.readFileSync('../helmtest2_values.yaml', 'utf8')
const helm_values = YAML.parse(helm_values_file)

getDirectories("../docker").forEach(container => {
  helm_values["container_images"][container+"_docker_image"] = repo.buildAndPushImage("../docker/" + container);
});

// Create an EKS cluster.
const cluster = new eks.Cluster("tq-private-chain");

// Deploy Tezos into our cluster.
const chain = new k8s.helm.v2.Chart("chain", {
    path: "../tezos-helm",
    values: helm_values,
}, { providers: { "kubernetes": cluster.provider } });

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
