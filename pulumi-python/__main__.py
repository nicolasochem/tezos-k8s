"""An AWS Python Pulumi program"""

import pulumi
import base64
import iam
import os
import vpc
import utils
import yaml
from pulumi_aws import s3, eks, ecr
import pulumi_docker as docker
from pulumi_kubernetes.helm.v3 import Chart, LocalChartOpts


with open("../helmtest2_values.yaml", "r") as file:
    helm_values = yaml.safe_load(file)

repo = ecr.Repository('tezos-k8s')

# Get registry info (creds and endpoint).
def getRegistryInfo(rid):
    creds = ecr.get_credentials(registry_id=rid)
    decoded = base64.b64decode(creds.authorization_token).decode()
    parts = decoded.split(':')
    if len(parts) != 2:
        raise Exception("Invalid credentials")
    return docker.ImageRegistry(creds.proxy_endpoint, parts[0], parts[1])

image_name = repo.repository_url
registry_info = repo.registry_id.apply(getRegistryInfo)

for container in next(os.walk('../docker'))[1]:
    image = docker.Image(container,
        build=f"../docker/{container}",
        image_name = repo.repository_url,
        registry=registry_info
    )
    helm_values["container_images"][f"{container}_docker_image"] = pulumi.export('fullImageName', image.image_name)


print(helm_values)
eks_cluster = eks.Cluster(
    'eks-cluster',
    role_arn=iam.eks_role.arn,
    tags={
        'Name': 'pulumi-eks-cluster',
    },
    vpc_config=eks.ClusterVpcConfigArgs(
        public_access_cidrs=['0.0.0.0/0'],
        security_group_ids=[vpc.eks_security_group.id],
        subnet_ids=vpc.subnet_ids,
    ),
)

eks_node_group = eks.NodeGroup(
    'eks-node-group',
    cluster_name=eks_cluster.name,
    node_group_name='pulumi-eks-nodegroup',
    node_role_arn=iam.ec2_role.arn,
    subnet_ids=vpc.subnet_ids,
    tags={
        'Name': 'pulumi-cluster-nodeGroup',
    },
    scaling_config=eks.NodeGroupScalingConfigArgs(
        desired_size=2,
        max_size=2,
        min_size=1,
    ),
)

tezos_k8s_chart = Chart(
    "tezos-k8s",
    LocalChartOpts(
        path="../tezos-helm",
        values=helm_values,
    ),
)
pulumi.export('cluster-name', eks_cluster.name)
pulumi.export('kubeconfig', utils.generate_kube_config(eks_cluster))
