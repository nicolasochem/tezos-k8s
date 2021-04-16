import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as awsx from "@pulumi/awsx";

import * as fs from 'fs';
import * as YAML from 'yaml'

const repo = new awsx.ecr.Repository("tezos-k8s");

// Manual step: create a pulumi_values.yaml in the top level dir
// with mkchain command:
//   mkchain pulumi
//

const chainName = pulumi.getStack();

const defaultHelmValuesFile = fs.readFileSync("../charts/tezos/values.yaml", 'utf8')
const defaultHelmValues = YAML.parse(defaultHelmValuesFile)

const helmValuesFile = fs.readFileSync(chainName + '_values.yaml', 'utf8')
const helmValues = YAML.parse(helmValuesFile)

const tezosK8sImages = defaultHelmValues["tezos_k8s_images"]
const pulumiTaggedImages = Object.entries(tezosK8sImages).reduce(
    (obj, [key]) => {
	obj[key] = repo.buildAndPushImage(`../${key.replace(/_/g, "-")}`)
	return obj
    },
    {}
)

helmValues["tezos_k8s_images"] = pulumiTaggedImages

const tags = { "project": "subnets", "owner": "pulumi"};

// Create a VPC with subnets that are tagged for load balancer usage.
const vpc = new awsx.ec2.Vpc("vpc",
    {
        tags: {"Name": `${projectName}`, ...tags},
        subnets: [
            // Tag subnets for specific load-balancer usage.
            // Any non-null tag value is valid.
            // See:
            //  - https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html
            //  - https://github.com/pulumi/pulumi-eks/issues/196
            //  - https://github.com/pulumi/pulumi-eks/issues/415
            {type: "public", tags: {"kubernetes.io/role/elb": "1", ...tags}},
            {type: "private", tags: {"kubernetes.io/role/internal-elb": "1", ...tags}},
        ],
    },
    {
        // Inform pulumi to ignore tag changes to the VPCs or subnets, so that
        // tags auto-added by AWS EKS do not get removed during future
        // refreshes and updates, as they are added outside of pulumi's management
        // and would be removed otherwise.
        // See: https://github.com/pulumi/pulumi-eks/issues/271#issuecomment-548452554
        transformations: [(args: any) => {
            if (args.type === "aws:ec2/vpc:Vpc" || args.type === "aws:ec2/subnet:Subnet") {
                return {
                    props: args.props,
                    opts: pulumi.mergeOptions(args.opts, { ignoreChanges: ["tags"] }),
                };
            }
            return undefined;
        }],
    },
);

// Create a cluster using the VPC and subnets.
const cluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.id,
    publicSubnetIds: vpc.publicSubnetIds,
    privateSubnetIds: vpc.privateSubnetIds,
    tags,
});
V

// Create an EKS cluster.
const cluster = new eks.Cluster(chainName + "-chain", {
    vpcId: vpc.id,
    subnetIds: vpc.publicSubnetIds,
    instanceType: "t3.xlarge",
    desiredCapacity: desiredClusterCapacity,
    minSize: 3,
    maxSize: 100,
})

const ns = new k8s.core.v1.Namespace("tezos", {metadata: {name:"tezos",}},
					      { provider: cluster.provider});
export const nsName = ns.metadata.name;

// Deploy Tezos into our cluster.
const chain = new k8s.helm.v2.Chart("chain", {
    namespace: nsName,
    path: "../charts/tezos",
    values: helmValues,
}, { providers: { "kubernetes": cluster.provider } });

if (helmValues["rpc_auth"] == true) {
    const nginxIngressHelmValues_file
	= fs.readFileSync('nginx_ingress_values.yaml', 'utf8')
    const nginxIngressHelmValues = YAML.parse(nginxIngressHelmValues_file)

    const rpc = new k8s.helm.v2.Chart("rpc-auth", {
	namespace: nsName,
	path: "../charts/rpc-auth",
	values: helmValues,
    }, { providers: { "kubernetes": cluster.provider } });

    // Manual step at this point:
    // * create a certificate
    // * put certificate arn in the nginx_ingress_values.yaml
    const nginxIngress = new k8s.helm.v2.Chart("nginx-ingress", {
	namespace: nsName,
	chart: "ingress-nginx",
	fetchOpts: {
	  repo: "https://kubernetes.github.io/ingress-nginx" },
	values: nginxIngressHelmValues,
    }, { providers: { "kubernetes": cluster.provider } });
}

// Manual steps after all is done:
// Enable proxy protocol v2 on the target groups:
//   https://github.com/kubernetes/ingress-nginx/issues/5051#issuecomment-685736696
// Create a A record in the dns domain for which a certificate was created.

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
export const clusterName = cluster.eksCluster.name;
